import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id').eq('user_id', user.id).single()
  if (!broker?.brokerage_id) return NextResponse.json([])

  const { data } = await adminSupabase
    .from('referral_partners')
    .select('*')
    .eq('brokerage_id', broker.brokerage_id)
    .order('full_name')

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id').eq('user_id', user.id).single()
  if (!broker?.brokerage_id) return new NextResponse('Not onboarded', { status: 403 })

  const body = await req.json()
  const { full_name, company, email, phone, partner_type, notes } = body
  if (!full_name?.trim()) return NextResponse.json({ error: 'full_name required' }, { status: 400 })

  const { data, error } = await adminSupabase
    .from('referral_partners')
    .insert({ brokerage_id: broker.brokerage_id, full_name: full_name.trim(), company, email, phone, partner_type: partner_type ?? 'realtor', notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
