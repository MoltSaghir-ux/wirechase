import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { logActivity } from '@/lib/activity'

const adminSupabase = createAdminSupabaseClient()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { docRequestId, action, note } = await req.json()
  if (!docRequestId || !['approved', 'rejected'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Verify this doc belongs to this broker's client
  const { data: docReq } = await supabase
    .from('document_requests')
    .select('id, label, client_id, clients (id, full_name, email, invite_token, broker_id)')
    .eq('id', docRequestId)
    .single()

  if (!docReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const client = docReq.clients as any
  if (client.broker_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Update doc status + note
  await adminSupabase
    .from('document_requests')
    .update({ status: action, notes: note?.slice(0, 500) ?? null })
    .eq('id', docRequestId)

  await logActivity(client.id, action === 'approved' ? 'doc_approved' : 'doc_rejected', `${action === 'approved' ? 'Approved' : 'Rejected'}: ${docReq.label}${note ? ` — "${note}"` : ''}`)

  // If rejected, email client so they can re-upload
  if (action === 'rejected') {
    const uploadLink = `${process.env.NEXT_PUBLIC_APP_URL}/client/upload/${client.invite_token}`
    const toEmail = process.env.NODE_ENV === 'production' ? client.email : (process.env.RESEND_TEST_EMAIL ?? client.email)

    await resend.emails.send({
      from: 'WireChase <onboarding@resend.dev>',
      to: toEmail,
      subject: `Action needed — please re-upload: ${docReq.label}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px;">
            <div style="background:#3b82f6; width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center;">
              <span style="color:white; font-weight:bold; font-size:13px;">W</span>
            </div>
            <span style="font-weight:bold; font-size:16px;">WireChase</span>
          </div>
          <h2 style="margin:0 0 8px;">Document needs to be re-uploaded</h2>
          <p style="color:#555; margin:0 0 12px;">Hi ${client.full_name},</p>
          <p style="color:#555; margin:0 0 8px;">Your loan officer reviewed <strong>${docReq.label}</strong> and it needs to be re-submitted.</p>
          ${note ? `<div style="background:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:12px 16px; margin:16px 0; color:#92400e;">
            <strong>Note from your loan officer:</strong><br/>${note}
          </div>` : ''}
          <a href="${uploadLink}" style="display:inline-block; background:#2563eb; color:white; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; margin:16px 0 24px;">
            Re-upload Document →
          </a>
          <hr style="border:none; border-top:1px solid #eee; margin:24px 0;"/>
          <p style="color:#bbb; font-size:12px; margin:0;">WireChase · Mortgage Document Platform</p>
        </div>
      `,
    })
  }

  return NextResponse.json({ success: true })
}
