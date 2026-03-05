import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { Resend } from 'resend'

const adminSupabase = createAdminSupabaseClient()
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, role, brokerageId } = await req.json()
  if (!email || !brokerageId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Verify requester is admin of this brokerage
  const { data: broker } = await adminSupabase
    .from('brokers')
    .select('role, brokerage_id, brokerages (name)')
    .eq('id', user.id)
    .single()

  if (broker?.role !== 'admin' || broker?.brokerage_id !== brokerageId) {
    return NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 })
  }

  const brokerage = broker.brokerages as any

  // Create invite
  const { data: invite, error } = await adminSupabase
    .from('team_invites')
    .insert({ brokerage_id: brokerageId, invited_by: user.id, email, role })
    .select()
    .single()

  if (error || !invite) return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/join/${invite.token}`
  const toEmail = process.env.NODE_ENV === 'production' ? email : (process.env.RESEND_TEST_EMAIL ?? email)

  // Send invite email
  try {
    await resend.emails.send({
      from: 'WireChase <onboarding@resend.dev>',
      to: toEmail,
      subject: `You've been invited to join ${brokerage.name} on WireChase`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px;">
            <div style="background:#0f2240; width:28px; height:28px; border-radius:6px; text-align:center; line-height:28px;">
              <span style="color:#c9a84c; font-weight:bold; font-size:13px;">W</span>
            </div>
            <span style="font-weight:bold; font-size:16px;">WireChase</span>
          </div>
          <h2 style="margin:0 0 8px;">You've been invited</h2>
          <p style="color:#6b7280; margin:0 0 20px;">
            You've been invited to join <strong style="color:#111;">${brokerage.name}</strong> on WireChase as a <strong>${role === 'admin' ? 'Admin' : 'Loan Officer'}</strong>.
          </p>
          <a href="${inviteLink}" style="display:inline-block; background:#0f2240; color:white; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; margin-bottom:24px;">
            Accept Invite & Create Account →
          </a>
          <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;"/>
          <p style="color:#9ca3af; font-size:12px; margin:0;">WireChase · Mortgage Document Platform</p>
        </div>
      `,
    })
  } catch (emailErr) {
    console.error('Failed to send invite email:', emailErr)
    // Invite was already created — return success with a warning rather than failing the whole request
    return NextResponse.json({ success: true, inviteLink, emailWarning: 'Invite created but email failed to send' })
  }

  return NextResponse.json({ success: true, inviteLink })
}
