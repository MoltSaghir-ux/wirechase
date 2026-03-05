import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const loanId = req.nextUrl.searchParams.get('loanId')
  if (!loanId) return NextResponse.json({ error: 'loanId required' }, { status: 400 })

  // Verify loan belongs to this broker or their brokerage
  const { data: broker } = await adminSupabase.from('brokers').select('id, brokerage_id, role').eq('id', user.id).single()
  if (!broker?.brokerage_id) return NextResponse.json({ error: 'Not onboarded' }, { status: 403 })

  const { data: loan } = await adminSupabase.from('loans').select('id, broker_id, brokerage_id').eq('id', loanId).single()
  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = loan.broker_id === user.id
  const isTeamAdmin = broker.role === 'admin' && loan.brokerage_id === broker.brokerage_id
  if (!isOwner && !isTeamAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await adminSupabase
    .from('loan_conditions')
    .select('*')
    .eq('loan_id', loanId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conditions: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { loanId, clientId, conditionText, category, notes } = body

  if (!loanId || !clientId || !conditionText?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify loan ownership before inserting
  const { data: broker } = await adminSupabase.from('brokers').select('id, brokerage_id, role').eq('id', user.id).single()
  if (!broker?.brokerage_id) return NextResponse.json({ error: 'Not onboarded' }, { status: 403 })

  const { data: loan } = await adminSupabase.from('loans').select('id, broker_id, brokerage_id').eq('id', loanId).single()
  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })

  const isOwner = loan.broker_id === user.id
  const isTeamAdmin = broker.role === 'admin' && loan.brokerage_id === broker.brokerage_id
  if (!isOwner && !isTeamAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await adminSupabase
    .from('loan_conditions')
    .insert({
      loan_id: loanId,
      client_id: clientId,
      condition_text: conditionText.trim(),
      category: category || 'Other',
      notes: notes?.trim() || null,
      status: 'open',
      source: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ condition: data })
}
