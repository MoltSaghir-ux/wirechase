import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

const STATUS_TIMESTAMPS: Record<string, string> = {
  requested: 'requested_at',
  received: 'received_at',
  submitted: 'submitted_at',
  cleared: 'cleared_at',
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { status, notes } = body

  // Verify condition belongs to this broker's loan/client
  const { data: condition } = await adminSupabase
    .from('loan_conditions')
    .select('id, loan_id, loans(broker_id, brokerage_id)')
    .eq('id', id)
    .single()

  if (!condition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const loanData = condition.loans as any
  const { data: broker } = await adminSupabase.from('brokers').select('id, brokerage_id, role').eq('id', user.id).single()
  if (!broker?.brokerage_id) return NextResponse.json({ error: 'Not onboarded' }, { status: 403 })

  const isOwner = loanData?.broker_id === user.id
  const isTeamAdmin = broker.role === 'admin' && loanData?.brokerage_id === broker.brokerage_id
  if (!isOwner && !isTeamAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status) {
    updates.status = status
    const tsField = STATUS_TIMESTAMPS[status]
    if (tsField) updates[tsField] = new Date().toISOString()
  }
  if (notes !== undefined) updates.notes = notes

  const { data, error } = await adminSupabase
    .from('loan_conditions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ condition: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify condition belongs to this broker's loan
  const { data: condition } = await adminSupabase
    .from('loan_conditions')
    .select('id, loan_id, loans(broker_id, brokerage_id)')
    .eq('id', id)
    .single()

  if (!condition) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const loanData = condition.loans as any
  const { data: broker } = await adminSupabase.from('brokers').select('id, brokerage_id, role').eq('id', user.id).single()
  if (!broker?.brokerage_id) return NextResponse.json({ error: 'Not onboarded' }, { status: 403 })

  const isOwner = loanData?.broker_id === user.id
  const isTeamAdmin = broker.role === 'admin' && loanData?.brokerage_id === broker.brokerage_id
  if (!isOwner && !isTeamAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await adminSupabase
    .from('loan_conditions')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
