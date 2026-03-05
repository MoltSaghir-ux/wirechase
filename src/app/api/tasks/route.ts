import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { searchParams } = new URL(req.url)
  const loanId = searchParams.get('loanId')
  if (!loanId) return NextResponse.json({ error: 'loanId required' }, { status: 400 })

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id').eq('id', user.id).single()
  if (!broker?.brokerage_id) return NextResponse.json([])

  const { data } = await adminSupabase
    .from('loan_tasks')
    .select('*')
    .eq('loan_id', loanId)
    .eq('brokerage_id', broker.brokerage_id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id, full_name').eq('id', user.id).single()
  if (!broker?.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  const body = await req.json()
  const { loan_id, client_id, title, description, assigned_to_user_id, assigned_to_name, due_date, priority } = body
  if (!loan_id || !title?.trim()) return NextResponse.json({ error: 'loan_id and title required' }, { status: 400 })

  // Verify loan ownership
  const { data: loan } = await adminSupabase.from('loans').select('client_id, clients(brokerage_id)').eq('id', loan_id).single()
  if (!loan || (loan.clients as any)?.brokerage_id !== broker.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  const { data, error } = await adminSupabase
    .from('loan_tasks')
    .insert({
      loan_id, client_id: client_id ?? loan.client_id,
      brokerage_id: broker.brokerage_id,
      title: title.trim(), description, assigned_to_user_id, assigned_to_name,
      due_date, priority: priority ?? 'normal',
      status: 'open', created_by_user_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
