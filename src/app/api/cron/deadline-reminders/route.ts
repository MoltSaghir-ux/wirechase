import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function GET(req: NextRequest) {
  // Verify cron secret — reject if CRON_SECRET env var is not set
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results: string[] = []

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    // ── 1. Rate lock expiring within 7 days ──
    const rateLockCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data: expiringLocks } = await adminSupabase
      .from('loans')
      .select('id, client_id, rate_lock_expiry, clients(full_name, broker_id, brokers(email, full_name))')
      .lte('rate_lock_expiry', rateLockCutoff)
      .gte('rate_lock_expiry', now.toISOString().slice(0, 10))
      .neq('loan_stage', 'funded')
      .neq('loan_stage', 'denied')

    for (const loan of expiringLocks ?? []) {
      const client = loan.clients as any
      const broker = client?.brokers as any
      if (!broker?.email) continue
      const daysLeft = Math.ceil((new Date(loan.rate_lock_expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      await resend.emails.send({
        from: 'WireChase <alerts@resend.dev>',
        to: process.env.NODE_ENV === 'production' ? broker.email : (process.env.RESEND_TEST_EMAIL ?? broker.email),
        subject: `Rate Lock Expiring in ${daysLeft} Days — ${client.full_name}`,
        html: `
          <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;color:#111;">
            <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0;font-weight:700;color:#92400e;">Rate Lock Expiring Soon</p>
              <p style="margin:4px 0 0;color:#b45309;font-size:14px;">
                <strong>${client.full_name}</strong>'s rate lock expires in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> on ${new Date(loan.rate_lock_expiry).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
              </p>
            </div>
            <p style="color:#6b7280;font-size:14px;">Log in to WireChase to take action before the lock expires.</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/broker/clients/${loan.client_id}" 
               style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;margin-top:8px;">
              View Loan File →
            </a>
          </div>
        `,
      })
      results.push(`rate-lock: ${client.full_name}`)
    }

    // ── 2. Stale open conditions (14+ days no movement) ──
    const staleCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: staleConditions } = await adminSupabase
      .from('loan_conditions')
      .select('id, condition_text, client_id, clients(full_name, broker_id, brokers(email, full_name))')
      .eq('status', 'open')
      .lte('created_at', staleCutoff)

    // Group by client to send one email per client
    const staleByClient: Record<string, { clientName: string; brokerEmail: string; clientId: string; conditions: string[] }> = {}
    for (const cond of staleConditions ?? []) {
      const client = cond.clients as any
      const broker = client?.brokers as any
      if (!broker?.email) continue
      if (!staleByClient[cond.client_id]) {
        staleByClient[cond.client_id] = { clientName: client.full_name, brokerEmail: broker.email, clientId: cond.client_id, conditions: [] }
      }
      staleByClient[cond.client_id].conditions.push(cond.condition_text)
    }

    for (const { clientName, brokerEmail, clientId, conditions } of Object.values(staleByClient)) {
      await resend.emails.send({
        from: 'WireChase <alerts@resend.dev>',
        to: process.env.NODE_ENV === 'production' ? brokerEmail : (process.env.RESEND_TEST_EMAIL ?? brokerEmail),
        subject: `${conditions.length} Stale Condition${conditions.length !== 1 ? 's' : ''} — ${clientName}`,
        html: `
          <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;color:#111;">
            <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
              <p style="margin:0;font-weight:700;color:#991b1b;">Conditions Need Attention</p>
              <p style="margin:4px 0 0;color:#b91c1c;font-size:14px;">
                <strong>${clientName}</strong> has ${conditions.length} open condition${conditions.length !== 1 ? 's' : ''} with no movement in 14+ days.
              </p>
            </div>
            <ul style="padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
              ${conditions.map(c => `<li>${c}</li>`).join('')}
            </ul>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/broker/clients/${clientId}?tab=conditions"
               style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;margin-top:8px;">
              View Conditions →
            </a>
          </div>
        `,
      })
      results.push(`stale-conditions: ${clientName} (${conditions.length})`)
    }

    // ── 3. Doc deadline reminders (3 days out) ──
    const deadlineCutoff = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data: deadlineClients } = await adminSupabase
      .from('clients')
      .select('id, full_name, email, deadline_at, deadline_reminder_sent')
      .lte('deadline_at', deadlineCutoff)
      .gte('deadline_at', now.toISOString())
      .eq('deadline_reminder_sent', false)
      .neq('status', 'archived')

    for (const client of deadlineClients ?? []) {
      const daysLeft = Math.ceil((new Date(client.deadline_at!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      await resend.emails.send({
        from: 'WireChase <alerts@resend.dev>',
        to: process.env.NODE_ENV === 'production' ? client.email : (process.env.RESEND_TEST_EMAIL ?? client.email),
        subject: `⏰ Reminder: Document Deadline in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`,
        html: `
          <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;color:#111;">
            <h2 style="margin:0 0 8px;">Hi ${client.full_name},</h2>
            <p style="color:#6b7280;font-size:15px;margin:0 0 20px;">
              Your document deadline is in <strong style="color:#111;">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>. Please upload any remaining documents as soon as possible.
            </p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/client/upload/${client.id}"
               style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">
              Upload Documents →
            </a>
          </div>
        `,
      })
      await adminSupabase.from('clients').update({ deadline_reminder_sent: true }).eq('id', client.id)
      results.push(`deadline: ${client.full_name}`)
    }

    return NextResponse.json({ success: true, sent: results.length, results })
  } catch (err: any) {
    console.error('Cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
