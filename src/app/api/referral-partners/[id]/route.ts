import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

async function getAuthedBroker(user_id: string) {
  const { data } = await adminSupabase.from('brokers').select('brokerage_id, role').eq('user_id', user_id).single()
  return data
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const broker = await getAuthedBroker(user.id)
  if (!broker?.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  // Verify partner belongs to this brokerage
  const { data: partner } = await adminSupabase.from('referral_partners').select('brokerage_id').eq('id', id).single()
  if (!partner || partner.brokerage_id !== broker.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  const body = await req.json()
  const { full_name, company, email, phone, partner_type, notes } = body

  const { data, error } = await adminSupabase
    .from('referral_partners')
    .update({ full_name, company, email, phone, partner_type, notes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const broker = await getAuthedBroker(user.id)
  if (!broker?.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  const { data: partner } = await adminSupabase.from('referral_partners').select('brokerage_id').eq('id', id).single()
  if (!partner || partner.brokerage_id !== broker.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  await adminSupabase.from('referral_partners').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
