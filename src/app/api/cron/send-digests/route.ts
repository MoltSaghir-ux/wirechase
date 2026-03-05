import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const adminSupabase = createAdminSupabaseClient()
const resend = new Resend(process.env.RESEND_API_KEY)

const BATCH_WINDOW_MS = 5 * 60 * 1000 // 5 minutes — wait this long after first upload before sending

export async function GET(req: NextRequest) {
  // Verify cron secret via Authorization header (consistent with deadline-reminders)
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - BATCH_WINDOW_MS).toISOString()

  // Find all clients with pending notifications older than 5 minutes
  const { data: pendingClients } = await adminSupabase
    .from('clients')
    .select('id, full_name, email, broker_id, invite_token, notification_pending_since, brokers (email)')
    .eq('notification_pending', true)
    .lt('notification_pending_since', cutoff)

  if (!pendingClients || pendingClients.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0

  for (const client of pendingClients) {
    try {
      // Get all uploaded docs
      const { data: uploadedDocs } = await adminSupabase
        .from('document_requests')
        .select('label')
        .eq('client_id', client.id)
        .eq('status', 'uploaded')

      if (!uploadedDocs || uploadedDocs.length === 0) {
        // Nothing to notify about, just clear the flag
        await adminSupabase
          .from('clients')
          .update({ notification_pending: false, notification_pending_since: null })
          .eq('id', client.id)
        continue
      }

      const brokerEmail = (client.brokers as any)?.email
      if (!brokerEmail) continue

      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/broker/clients/${client.id}`
      const docCount = uploadedDocs.length
      const docList = uploadedDocs.map(d => `<li style="margin:6px 0; color:#374151; padding:4px 0;">${d.label}</li>`).join('')
      const toEmail = process.env.NODE_ENV === 'production' ? brokerEmail : (process.env.RESEND_TEST_EMAIL ?? brokerEmail)

      await resend.emails.send({
        from: 'WireChase <onboarding@resend.dev>',
        to: toEmail,
        subject: `${client.full_name} uploaded ${docCount} document${docCount > 1 ? 's' : ''} — review needed`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px;">
              <div style="background:#3b82f6; width:28px; height:28px; border-radius:6px; text-align:center; line-height:28px;">
                <span style="color:white; font-weight:bold; font-size:13px;">W</span>
              </div>
              <span style="font-weight:bold; font-size:16px;">WireChase</span>
            </div>

            <h2 style="margin:0 0 8px; font-size:20px;">
              ${docCount} document${docCount > 1 ? 's' : ''} ready for review
            </h2>
            <p style="color:#6b7280; margin:0 0 20px;">
              <strong style="color:#111;">${client.full_name}</strong> has finished uploading. Here's what was submitted:
            </p>

            <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:16px 20px; margin-bottom:24px;">
              <ul style="padding-left:16px; margin:0; list-style:disc;">
                ${docList}
              </ul>
            </div>

            <a href="${dashboardUrl}"
               style="display:inline-block; background:#2563eb; color:white; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; font-size:14px; margin-bottom:24px;">
              Review & Approve →
            </a>

            <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;"/>
            <p style="color:#9ca3af; font-size:12px; margin:0;">WireChase · Mortgage Document Platform</p>
          </div>
        `,
      })

      // Clear the pending flag
      await adminSupabase
        .from('clients')
        .update({ notification_pending: false, notification_pending_since: null, broker_last_notified_at: new Date().toISOString() })
        .eq('id', client.id)

      sent++
    } catch (e) {
      console.error(`Failed to send digest for client ${client.id}:`, e)
    }
  }

  return NextResponse.json({ sent, total: pendingClients.length })
}
