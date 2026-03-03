import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: invite, error } = await adminSupabase
    .from('team_invites')
    .select('id, email, role, accepted_at, brokerages (name)')
    .eq('token', token)
    .single()

  if (error || !invite) return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })

  const brokerage = invite.brokerages as any
  return NextResponse.json({
    brokerageName: brokerage?.name ?? 'Unknown Brokerage',
    role: invite.role,
    email: invite.email,
  })
}
