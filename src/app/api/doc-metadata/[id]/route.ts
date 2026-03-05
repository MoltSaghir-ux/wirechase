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
