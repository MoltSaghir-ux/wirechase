import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { logActivity } from '@/lib/activity'

const adminSupabase = createAdminSupabaseClient()

const VALID_STAGES = ['application', 'processing', 'submitted_uw', 'conditional_approval', 'clear_to_close', 'closing', 'funded', 'denied']

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { loanId, stage } = await req.json()
  if (!loanId || !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Verify ownership
  const { data: loan } = await adminSupabase
    .from('loans')
    .select('id, loan_stage, client_id, broker_id')
    .eq('id', loanId)
    .eq('broker_id', user.id)
    .single()

  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const prevStage = loan.loan_stage

  await adminSupabase
    .from('loans')
    .update({ loan_stage: stage, updated_at: new Date().toISOString() })
    .eq('id', loanId)

  // Log status history
  await adminSupabase.from('loan_status_history').insert({
    loan_id: loanId,
    from_status: prevStage,
    to_status: stage,
    changed_by: 'broker',
  })

  // Log activity on client
  const stageLabels: Record<string, string> = {
    application: 'Application',
    processing: 'Processing',
    submitted_uw: 'Submitted to Underwriting',
    conditional_approval: 'Conditional Approval',
    clear_to_close: 'Clear to Close',
    closing: 'Closing',
    funded: 'Funded 🎉',
    denied: 'Denied',
  }
  await logActivity(loan.client_id, 'stage_changed', `Loan stage updated: ${stageLabels[prevStage] ?? prevStage} → ${stageLabels[stage] ?? stage}`)

  // Send milestone email to borrower
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    // Fetch client info for this loan
    const { data: loanWithClient } = await adminSupabase
      .from('loans')
      .select('client_id, clients(full_name, email, invite_token)')
      .eq('id', loanId)
      .single()

    const client = loanWithClient?.clients as any
    if (client?.email) {
      const STAGE_MESSAGES: Record<string, { subject: string; headline: string; body: string; color: string }> = {
        processing: {
          subject: '📂 Your Loan is Being Processed',
          headline: 'Your loan is in processing',
          body: 'Great news! Your loan application has been received and is currently being processed by our team. We will be in touch if we need any additional documents.',
          color: '#3b82f6',
        },
        submitted_uw: {
          subject: '📋 Your Loan Has Been Submitted to Underwriting',
          headline: 'Submitted to underwriting',
          body: 'Your complete loan package has been submitted to the underwriter for review. This typically takes 3–5 business days. We will notify you as soon as we hear back.',
          color: '#8b5cf6',
        },
        conditional_approval: {
          subject: '✅ Conditional Approval — Action May Be Required',
          headline: 'Conditional approval received',
          body: 'Congratulations! Your loan has received a conditional approval from underwriting. There may be a few items (conditions) we need from you to move forward. Your loan officer will be in touch shortly with details.',
          color: '#f59e0b',
        },
        clear_to_close: {
          subject: '🎉 Clear to Close — You\'re Almost There!',
          headline: 'Clear to Close!',
          body: 'Excellent news — your loan has been cleared to close by underwriting! All conditions have been satisfied. Your loan officer will be reaching out to schedule your closing date and walk you through the next steps.',
          color: '#10b981',
        },
        closing: {
          subject: '📅 Your Closing is Scheduled',
          headline: 'Closing day is coming',
          body: 'Your loan is in the closing stage. Please review any closing documents sent to you carefully and contact your loan officer if you have any questions before signing.',
          color: '#14b8a6',
        },
        funded: {
          subject: '🏠 Congratulations — Your Loan is Funded!',
          headline: 'Your loan has been funded!',
          body: 'Congratulations! Your mortgage loan has been officially funded. Welcome to your new home! Thank you for choosing us for your mortgage needs.',
          color: '#16a34a',
        },
      }

      const msg = STAGE_MESSAGES[stage]
      if (msg) {
        const uploadLink = `${process.env.NEXT_PUBLIC_APP_URL}/client/upload/${client.invite_token}`
        await resend.emails.send({
          from: 'WireChase <updates@resend.dev>',
          to: process.env.NODE_ENV === 'production' ? client.email : (process.env.RESEND_TEST_EMAIL ?? client.email),
          subject: msg.subject,
          html: `
            <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;color:#111;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:28px;">
                <div style="background:#3b82f6;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                  <span style="color:white;font-weight:bold;font-size:16px;">W</span>
                </div>
                <span style="font-weight:bold;font-size:18px;">WireChase</span>
              </div>
              <div style="background:${msg.color}15;border:1px solid ${msg.color}40;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
                <h2 style="margin:0 0 8px;font-size:20px;color:#111;">${msg.headline}</h2>
                <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">${msg.body}</p>
              </div>
              <p style="color:#6b7280;font-size:14px;">Hi ${client.full_name}, if you need to upload additional documents or check your document status, use the link below.</p>
              <a href="${uploadLink}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;margin-top:12px;">
                View My Documents →
              </a>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;"/>
              <p style="color:#d1d5db;font-size:11px;margin:0;">WireChase · Secure Mortgage Document Collection</p>
            </div>
          `,
        })
      }
    }
  } catch (emailErr) {
    console.error('Milestone email failed (non-fatal):', emailErr)
  }

  return NextResponse.json({ success: true, stage })
}
