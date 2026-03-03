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

  // Notify broker by email
  try {
    const { data: brokerData } = await adminSupabase
      .from('clients')
      .select('broker_id, full_name, brokers (email)')
      .eq('id', client.id)
      .single()

    const { data: docLabel } = await adminSupabase
      .from('document_requests')
      .select('label')
      .eq('id', docRequestId)
      .single()

    if (brokerData?.brokers) {
      const brokerEmail = (brokerData.brokers as any).email
      const clientName = brokerData.full_name
      const label = docLabel?.label ?? 'a document'
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/broker/clients/${client.id}`

      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const toEmail = process.env.NODE_ENV === 'production' ? brokerEmail : (process.env.RESEND_TEST_EMAIL ?? brokerEmail)

      await resend.emails.send({
        from: 'WireChase <onboarding@resend.dev>',
        to: toEmail,
        subject: `📄 ${clientName} uploaded a document`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px;">
              <div style="background:#3b82f6; width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center;">
                <span style="color:white; font-weight:bold; font-size:13px;">W</span>
              </div>
              <span style="font-weight:bold; font-size:16px;">WireChase</span>
            </div>
            <h2 style="margin:0 0 8px;">New document uploaded</h2>
            <p style="color:#555; margin:0 0 20px;">
              <strong>${clientName}</strong> just uploaded <strong>${label}</strong>.
            </p>
            <a href="${dashboardUrl}" style="display:inline-block; background:#2563eb; color:white; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; margin-bottom:24px;">
              View Document →
            </a>
            <hr style="border:none; border-top:1px solid #eee; margin:24px 0;"/>
            <p style="color:#bbb; font-size:12px; margin:0;">WireChase · Mortgage Document Platform</p>
          </div>
        `,
      })
    }
  } catch (e) {
    // Non-fatal — don't block the upload response
    console.error('Broker notification failed:', e)
  }

  return NextResponse.json({ success: true })
}
