import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function POST(req: NextRequest) {
  // Verify the session matches the userId being used
  // SECURITY: Don't trust userId from body — verify via session
  const supabase = await createServerSupabaseClient()
  const { data: { user: sessionUser } } = await supabase.auth.getUser()
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, email, fullName, brokerageName, brokerageNmls, inviteCode } = await req.json()

  if (!userId || !email || !fullName || !brokerageName || !inviteCode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate userId is a proper UUID to prevent injection
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
  }

  // Enforce: can only create brokerage for yourself
  if (sessionUser.id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  // 1. Validate invite code
  const { data: code, error: codeErr } = await adminSupabase
    .from('platform_invite_codes')
    .select('id, used_by')
    .eq('code', inviteCode.toUpperCase())
    .single()

  if (codeErr || !code) return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })
  if (code.used_by) return NextResponse.json({ error: 'This invite code has already been used' }, { status: 400 })

  // 2. Create brokerage
  const { data: brokerage, error: bErr } = await adminSupabase
    .from('brokerages')
    .insert({ name: brokerageName.trim(), nmls: brokerageNmls?.trim() || null })
    .select()
    .single()

  if (bErr) return NextResponse.json({ error: 'Failed to create brokerage' }, { status: 500 })

  // 3. Upsert broker as admin
  const { error: pErr } = await adminSupabase.from('brokers').upsert({
    id: userId,
    email,
    full_name: fullName.trim(),
    brokerage_id: brokerage.id,
    role: 'admin',
  })

  if (pErr) return NextResponse.json({ error: 'Failed to set up broker profile' }, { status: 500 })

  // 4. Mark invite code used
  await adminSupabase
    .from('platform_invite_codes')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('code', inviteCode.toUpperCase())

  return NextResponse.json({ ok: true })
}
