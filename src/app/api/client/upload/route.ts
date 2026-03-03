import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS for client uploads
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

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

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PDF, JPG, PNG, WEBP allowed' }, { status: 400 })
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
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

  // Save document record
  await adminSupabase.from('documents').insert({
    document_request_id: docRequestId,
    file_name: file.name.slice(0, 200),
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

  return NextResponse.json({ success: true })
}
