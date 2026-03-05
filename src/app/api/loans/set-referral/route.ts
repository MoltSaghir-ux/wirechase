import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { loanId, referralPartnerId, referralNotes } = await req.json()
  if (!loanId) return NextResponse.json({ error: 'loanId required' }, { status: 400 })

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id').eq('user_id', user.id).single()
  if (!broker?.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  const { data: loan } = await adminSupabase.from('loans').select('client_id, clients(brokerage_id)').eq('id', loanId).single()
  const loanBrokerageId = (loan?.clients as any)?.brokerage_id
  if (!loan || loanBrokerageId !== broker.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  const { error } = await adminSupabase
    .from('loans')
    .update({ referral_partner_id: referralPartnerId ?? null, referral_notes: referralNotes ?? null })
    .eq('id', loanId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
