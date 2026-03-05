import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function POST(req: NextRequest) {
  const { userId, email, fullName, brokerageName, brokerageNmls, inviteCode } = await req.json()

  if (!userId || !email || !fullName || !brokerageName || !inviteCode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate userId is a proper UUID to prevent injection
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
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

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })

  // 3. Upsert broker as admin
  const { error: pErr } = await adminSupabase.from('brokers').upsert({
    id: userId,
    email,
    full_name: fullName.trim(),
    brokerage_id: brokerage.id,
    role: 'admin',
  })

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  // 4. Mark invite code used
  await adminSupabase
    .from('platform_invite_codes')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('code', inviteCode.toUpperCase())

  return NextResponse.json({ ok: true })
}
