import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token || !/^[a-zA-Z0-9\-]{10,100}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  // Look up loan by co-borrower invite token
  const { data: loan } = await adminSupabase
    .from('loans')
    .select(`
      id, co_borrower_name, co_borrower_email, client_id, loan_type,
      clients (
        full_name,
        brokers ( full_name, brokerages ( name, nmls ) )
      )
    `)
    .eq('co_borrower_invite_token', token)
    .single()

  if (!loan) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

  // Get co-borrower specific doc requests (labeled "Co-Borrower — ...")
  const { data: docs } = await adminSupabase
    .from('document_requests')
    .select('id, label, status, required, category, notes')
    .eq('client_id', loan.client_id)
    .like('label', 'Co-Borrower%')
    .order('category')

  return NextResponse.json({
    loan: {
      ...loan,
      document_requests: docs ?? [],
    }
  })
}
