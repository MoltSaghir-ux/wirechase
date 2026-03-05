import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { doc_type, date_range_start, date_range_end, borrower_type } = body

  // Verify document request belongs to this broker's client
  const { data: docReq } = await adminSupabase
    .from('document_requests')
    .select('id, client_id, clients(broker_id, brokerage_id)')
    .eq('id', id)
    .single()

  if (!docReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const clientData = docReq.clients as any
  const { data: broker } = await adminSupabase.from('brokers').select('id, brokerage_id, role').eq('id', user.id).single()
  if (!broker?.brokerage_id) return NextResponse.json({ error: 'Not onboarded' }, { status: 403 })

  const isOwner = clientData?.broker_id === user.id
  const isTeamAdmin = broker.role === 'admin' && clientData?.brokerage_id === broker.brokerage_id
  if (!isOwner && !isTeamAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await adminSupabase
    .from('document_requests')
    .update({
      doc_type: doc_type ?? null,
      date_range_start: date_range_start ?? null,
      date_range_end: date_range_end ?? null,
      borrower_type: borrower_type ?? 'primary',
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ doc: data })
}
