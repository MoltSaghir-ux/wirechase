import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function POST(req: NextRequest) {
  // SECURITY: Verify session so the caller can only join as themselves
  const supabase = await createServerSupabaseClient()
  const { data: { user: sessionUser } } = await supabase.auth.getUser()
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token, userId, email, fullName } = await req.json()
  if (!token || !userId || !email || !fullName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Validate userId is a proper UUID to prevent injection
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
  }

  // Enforce: can only join as yourself
  if (sessionUser.id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Look up the invite
  const { data: invite, error: iErr } = await adminSupabase
    .from('team_invites')
    .select('id, brokerage_id, role, email, accepted_at')
    .eq('token', token)
    .single()

  if (iErr || !invite) return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
  if (invite.accepted_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })

  // Optional: enforce that the email matches the invite
  if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: 'This invite was sent to a different email address' }, { status: 403 })
  }

  // Upsert broker record
  const { error: bErr } = await adminSupabase.from('brokers').upsert({
    id: userId,
    email,
    full_name: fullName,
    brokerage_id: invite.brokerage_id,
    role: invite.role ?? 'loan_officer',
  })
  if (bErr) return NextResponse.json({ error: 'Failed to set up broker profile' }, { status: 500 })

  // Mark invite accepted
  await adminSupabase
    .from('team_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ ok: true })
}
