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

  const { memberId } = await req.json()
  if (!memberId) return NextResponse.json({ error: 'Missing memberId' }, { status: 400 })
  if (memberId === user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  // Verify requester is admin of same brokerage
  const { data: requester } = await adminSupabase.from('brokers').select('role, brokerage_id').eq('id', user.id).single()
  const { data: target } = await adminSupabase.from('brokers').select('brokerage_id').eq('id', memberId).single()

  if (requester?.role !== 'admin' || requester?.brokerage_id !== target?.brokerage_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Remove from brokerage (don't delete the account)
  await adminSupabase.from('brokers').update({ brokerage_id: null, role: 'admin' }).eq('id', memberId)

  return NextResponse.json({ success: true })
}
