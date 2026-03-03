import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId, email, fullName, brokerageName, brokerageNmls, inviteCode } = await req.json()

  if (!userId || !email || !fullName || !brokerageName || !inviteCode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
