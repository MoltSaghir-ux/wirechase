import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function POST(req: NextRequest) {
  const { code, userId } = await req.json()
  if (!code || !userId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Validate userId is a proper UUID
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
  }

  const { error } = await adminSupabase
    .from('platform_invite_codes')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('code', code.toUpperCase())
    .is('used_by', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
