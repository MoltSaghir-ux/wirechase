import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const loanId = req.nextUrl.searchParams.get('loanId')
  if (!loanId) return NextResponse.json({ error: 'loanId required' }, { status: 400 })

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
