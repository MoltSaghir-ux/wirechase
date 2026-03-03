import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json()
  if (!token?.trim()) return NextResponse.json({ error: 'Invite token required' }, { status: 400 })

  // Validate token format
  if (!/^[a-zA-Z0-9\-]{10,100}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid invite link' }, { status: 403 })
  }

  // Find invite
  const { data: invite } = await adminSupabase
    .from('team_invites')
    .select('id, brokerage_id, email, role, accepted_at')
    .eq('token', token)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invite not found or expired' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })

  // Accept invite — join the brokerage
  await adminSupabase.from('brokers').upsert({
    id: user.id,
    email: user.email ?? '',
    full_name: user.email?.split('@')[0] ?? 'Loan Officer',
    brokerage_id: invite.brokerage_id,
    role: invite.role,
  }, { onConflict: 'id' })

  // Mark invite accepted
  await adminSupabase
    .from('team_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ success: true })
}
