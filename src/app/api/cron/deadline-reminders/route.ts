import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const adminSupabase = createAdminSupabaseClient()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  // Find clients with deadline in next 3 days, reminder not yet sent, not complete
  const { data: clients } = await adminSupabase
    .from('clients')
    .select('id, full_name, email, invite_token, deadline_at')
    .eq('deadline_reminder_sent', false)
    .neq('status', 'complete')
    .neq('status', 'archived')
    .not('deadline_at', 'is', null)
    .lte('deadline_at', threeDaysFromNow.toISOString())

  if (!clients || clients.length === 0) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const client of clients) {
    try {
      const uploadLink = `${process.env.NEXT_PUBLIC_APP_URL}/client/upload/${client.invite_token}`
      const deadline = new Date(client.deadline_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      const toEmail = process.env.NODE_ENV === 'production' ? client.email : (process.env.RESEND_TEST_EMAIL ?? client.email)

      await resend.emails.send({
        from: 'WireChase <onboarding@resend.dev>',
        to: toEmail,
        subject: `Reminder: Your documents are due ${deadline}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px;">
              <div style="background:#3b82f6; width:28px; height:28px; border-radius:6px; text-align:center; line-height:28px;">
                <span style="color:white; font-weight:bold; font-size:13px;">W</span>
              </div>
              <span style="font-weight:bold; font-size:16px;">WireChase</span>
            </div>
            <h2 style="margin:0 0 8px;">Document deadline coming up</h2>
            <p style="color:#6b7280; margin:0 0 20px;">Hi ${client.full_name}, your documents are due on <strong style="color:#111;">${deadline}</strong>. Please upload any remaining documents as soon as possible.</p>
            <a href="${uploadLink}" style="display:inline-block; background:#2563eb; color:white; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; margin-bottom:24px;">
              Upload Documents →
            </a>
            <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;"/>
            <p style="color:#9ca3af; font-size:12px; margin:0;">WireChase · Mortgage Document Platform</p>
          </div>
        `,
      })

      await adminSupabase.from('clients').update({ deadline_reminder_sent: true }).eq('id', client.id)
      sent++
    } catch (e) {
      console.error(`Deadline reminder failed for ${client.id}:`, e)
    }
  }

  return NextResponse.json({ sent })
}
