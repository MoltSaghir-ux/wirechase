import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { logActivity } from '@/lib/activity'

// Service role client — bypasses RLS for client uploads
const adminSupabase = createAdminSupabaseClient()

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

async function validateFileMagicBytes(file: File): Promise<boolean> {
  const buffer = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const hex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('')

  if (file.type === 'application/pdf') {
    return hex.startsWith('255044462d') // %PDF-
  }
  if (file.type === 'image/jpeg') {
    return hex.startsWith('ffd8ff') // JPEG SOI
  }
  if (file.type === 'image/png') {
    return hex.startsWith('89504e47') // PNG
  }
  if (file.type === 'image/webp') {
    return hex.slice(8, 16) === '57454250' // WEBP
  }
  return false
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const token = formData.get('token') as string
  const docRequestId = formData.get('docRequestId') as string
  const file = formData.get('file') as File | null

  // Validate inputs
  if (!token || !docRequestId || !file) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate token format
  if (!/^[a-zA-Z0-9\-]{10,100}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  // Validate UUID format for docRequestId
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docRequestId)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PDF, JPG, PNG, WEBP allowed' }, { status: 400 })
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
  }

  // Validate magic bytes — ensure file content matches declared MIME type
  const magicValid = await validateFileMagicBytes(file)
  if (!magicValid) {
    return NextResponse.json({ error: 'File content does not match declared type' }, { status: 400 })
  }

  // Verify token → get client
  const { data: client } = await adminSupabase
    .from('clients')
    .select('id')
    .eq('invite_token', token)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Invalid invite link' }, { status: 403 })
  }

  // Rate limit: max 20 uploads per client in the last hour
  const { data: clientDocRequests } = await adminSupabase
    .from('document_requests')
    .select('id')
    .eq('client_id', client.id)

  const clientDocRequestIds = clientDocRequests?.map(d => d.id) ?? []

  if (clientDocRequestIds.length > 0) {
    const { data: recentUploads } = await adminSupabase
      .from('documents')
      .select('id')
      .in('document_request_id', clientDocRequestIds)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if ((recentUploads?.length ?? 0) >= 20) {
      return NextResponse.json({ error: 'Too many uploads. Please wait before trying again.' }, { status: 429 })
    }
  }

  // Verify doc request belongs to this client
  const { data: docReq } = await adminSupabase
    .from('document_requests')
    .select('id')
    .eq('id', docRequestId)
    .eq('client_id', client.id)
    .single()

  if (!docReq) {
    return NextResponse.json({ error: 'Document request not found' }, { status: 404 })
  }

  // Safe file path
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? 'bin'
  const filePath = `${client.id}/${docRequestId}/${Date.now()}.${ext}`

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: uploadError } = await adminSupabase.storage
    .from('documents')
    .upload(filePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  // Sanitize filename before storing
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_ ]/g, '_').slice(0, 200)

  // Save document record
  await adminSupabase.from('documents').insert({
    document_request_id: docRequestId,
    file_name: safeName,
    file_path: filePath,
    file_size: file.size,
  })

  // Update doc request status
  await adminSupabase
    .from('document_requests')
    .update({ status: 'uploaded' })
    .eq('id', docRequestId)

  // Check if all required docs are uploaded → mark client complete
  const { data: allDocs } = await adminSupabase
    .from('document_requests')
    .select('status, required')
    .eq('client_id', client.id)

  if (allDocs) {
    const requiredDocs = allDocs.filter(d => d.required)
    const allRequiredUploaded = requiredDocs.every(d => d.status !== 'missing')
    const allUploaded = allDocs.every(d => d.status !== 'missing')

    if (allUploaded) {
      await adminSupabase.from('clients').update({ status: 'complete' }).eq('id', client.id)
    } else if (allRequiredUploaded) {
      await adminSupabase.from('clients').update({ status: 'in_progress' }).eq('id', client.id)
    } else {
      await adminSupabase.from('clients').update({ status: 'in_progress' }).eq('id', client.id)
    }
  }

  // Log activity
  await logActivity(client.id, 'doc_uploaded', `Uploaded: ${(await adminSupabase.from('document_requests').select('label').eq('id', docRequestId).single()).data?.label ?? 'document'}`)

  // Queue a notification — cron will send the digest after 5 min of inactivity
  try {
    const { data: existing } = await adminSupabase
      .from('clients')
      .select('notification_pending, notification_pending_since')
      .eq('id', client.id)
      .single()

    // Only set pending_since on the FIRST upload in this batch (don't reset the timer)
    if (!existing?.notification_pending) {
      await adminSupabase
        .from('clients')
        .update({ notification_pending: true, notification_pending_since: new Date().toISOString() })
        .eq('id', client.id)
    }
  } catch (e) {
    console.error('Failed to queue notification:', e)
  }

  return NextResponse.json({ success: true })
}
