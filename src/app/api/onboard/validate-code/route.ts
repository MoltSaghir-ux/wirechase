import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const { data, error } = await adminSupabase
    .from('platform_invite_codes')
    .select('id, used_by')
    .eq('code', code.toUpperCase())
    .single()

  if (error || !data) return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })
  if (data.used_by) return NextResponse.json({ error: 'This invite code has already been used' }, { status: 400 })

  return NextResponse.json({ valid: true })
}
