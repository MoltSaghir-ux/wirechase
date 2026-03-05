import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    loanId,
    loanType, loanPurpose, loanAmount, purchasePrice,
    employmentType, yearsEmployed,
    propertyType, propertyUse, propertyAddress,
    coBorrower, coBorrowerName, coBorrowerEmail, coBorrowerEmploymentType,
    fileNumber,
    propertyCounty, propertyState, propertyZip, borrowerDob, borrowerSsnLast4,
  } = body

  if (!loanId) return NextResponse.json({ error: 'loanId required' }, { status: 400 })

  const { data, error } = await adminSupabase
    .from('loans')
    .update({
      loan_type: loanType,
      loan_purpose: loanPurpose,
      loan_amount: loanAmount ?? null,
      purchase_price: purchasePrice ?? null,
      employment_type: employmentType,
      years_employed: yearsEmployed ?? null,
      property_type: propertyType,
      property_use: propertyUse,
      property_address: propertyAddress ?? null,
      co_borrower: coBorrower ?? false,
      co_borrower_name: coBorrower ? coBorrowerName : null,
      co_borrower_email: coBorrower ? coBorrowerEmail : null,
      co_borrower_employment_type: coBorrower ? coBorrowerEmploymentType : null,
      file_number: fileNumber ?? null,
      property_county: propertyCounty ?? null,
      property_state: propertyState ?? null,
      property_zip: propertyZip ?? null,
      borrower_dob: borrowerDob ?? null,
      borrower_ssn_last4: borrowerSsnLast4 ?? null,
    })
    .eq('id', loanId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ loan: data })
}
