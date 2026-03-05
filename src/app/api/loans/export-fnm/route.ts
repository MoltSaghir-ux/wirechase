import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const loanId = req.nextUrl.searchParams.get('loanId')
  if (!loanId) return new NextResponse('loanId required', { status: 400 })

  const { data: loan } = await adminSupabase
    .from('loans')
    .select('*, clients(full_name, email, phone)')
    .eq('id', loanId)
    .single()

  if (!loan) return new NextResponse('Not found', { status: 404 })

  const client = loan.clients as { full_name?: string; email?: string; phone?: string } | null
  const nameParts = (client?.full_name ?? '').split(' ')
  const firstName = nameParts[0] ?? ''
  const lastName = nameParts.slice(1).join(' ') || firstName

  const LOAN_PURPOSE_FNM: Record<string, string> = { purchase: 'Purchase', refinance: 'Refinance', cashout: 'CashOut', heloc: 'HELOC' }
  const LOAN_TYPE_FNM: Record<string, string> = { conventional: 'Conventional', fha: 'FHA', va: 'VA', usda: 'USDA', jumbo: 'Conventional' }
  const PROPERTY_TYPE_FNM: Record<string, string> = { sfr: 'SFR', condo: 'Condo', multi: 'MultiFamily', townhouse: 'PUD', manufactured: 'ManufacturedHome' }

  const lines: string[] = []
  lines.push(`FILE_START|WireChase|3.2|${new Date().toISOString().slice(0, 10)}`)
  lines.push(`TRANS_DETAIL|${loan.file_number ?? loan.id}|${LOAN_PURPOSE_FNM[loan.loan_purpose] ?? 'Purchase'}|${LOAN_TYPE_FNM[loan.loan_type] ?? 'Conventional'}`)
  lines.push(`BORROWER_PRIMARY|${lastName}|${firstName}||${client?.email ?? ''}|${client?.phone ?? ''}`)
  if (loan.co_borrower && loan.co_borrower_name) {
    const coParts = (loan.co_borrower_name as string).split(' ')
    lines.push(`BORROWER_COBORROWER|${coParts.slice(1).join(' ') || coParts[0]}|${coParts[0]}||${loan.co_borrower_email ?? ''}|`)
  }
  lines.push(`LOAN_TERMS|${loan.loan_amount ?? loan.purchase_price ?? 0}|${loan.purchase_price ?? 0}|360|Fixed`)
  lines.push(`SUBJECT_PROPERTY|${loan.property_address ?? ''}|${loan.property_county ?? ''}|${loan.property_state ?? ''}|${loan.property_zip ?? ''}|${PROPERTY_TYPE_FNM[loan.property_type] ?? 'SFR'}|${loan.property_use ?? 'PrimaryResidence'}`)
  if (loan.property_apn) lines.push(`PROPERTY_APN|${loan.property_apn}`)
  if (loan.closing_date) lines.push(`CLOSING_DATE|${loan.closing_date}`)
  if (loan.rate_lock_expiry) lines.push(`RATE_LOCK_EXPIRY|${loan.rate_lock_expiry}`)
  if (loan.title_company) lines.push(`TITLE_COMPANY|${loan.title_company}`)
  lines.push(`FILE_END`)

  const content = lines.join('\n')
  const filename = `WireChase_${loan.file_number ?? loan.id}_FNM32.fnm`

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
