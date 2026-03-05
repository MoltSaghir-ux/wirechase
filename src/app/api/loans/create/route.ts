import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { generateDocChecklist, summarizeChecklist } from '@/lib/loan-doc-engine'
import { logActivity } from '@/lib/activity'
import type { LoanProfile } from '@/lib/loan-doc-engine'

const adminSupabase = createAdminSupabaseClient()

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get broker + brokerage
  const { data: broker } = await adminSupabase
    .from('brokers')
    .select('id, brokerage_id, email, full_name')
    .eq('id', user.id)
    .single()

  if (!broker?.brokerage_id) return NextResponse.json({ error: 'Not onboarded' }, { status: 403 })

  const body = await req.json()
  const {
    fullName, email, phone,
    loanType, loanPurpose, loanAmount, purchasePrice,
    employmentType, yearsEmployed,
    coBorrower, coBorrowerName, coBorrowerEmail, coBorrowerEmploymentType,
    propertyType, propertyUse, propertyAddress,
    hasGiftFunds, hasRentalIncome, hasBankruptcy, hasForeclosure, hasChildSupport,
  } = body

  if (!fullName || !email || !loanType || !loanPurpose || !employmentType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 1. Create client record
  const { data: client, error: clientErr } = await adminSupabase
    .from('clients')
    .insert({
      broker_id: user.id,
      brokerage_id: broker.brokerage_id,
      full_name: fullName.slice(0, 100),
      email: email.slice(0, 200).toLowerCase(),
      phone: phone?.slice(0, 20) ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (clientErr || !client) {
    console.error('Client create error:', clientErr)
    return NextResponse.json({ error: 'Failed to create client record' }, { status: 500 })
  }

  // 2. Create loan record
  const { data: loan, error: loanErr } = await adminSupabase
    .from('loans')
    .insert({
      client_id: client.id,
      broker_id: user.id,
      brokerage_id: broker.brokerage_id,
      loan_type: loanType,
      loan_purpose: loanPurpose,
      loan_amount: loanAmount ?? null,
      purchase_price: purchasePrice ?? null,
      employment_type: employmentType,
      years_employed: yearsEmployed ?? null,
      co_borrower: coBorrower ?? false,
      co_borrower_name: coBorrowerName ?? null,
      co_borrower_email: coBorrowerEmail ?? null,
      co_borrower_employment_type: coBorrowerEmploymentType ?? null,
      property_type: propertyType,
      property_use: propertyUse,
      property_address: propertyAddress ?? null,
      has_gift_funds: hasGiftFunds ?? false,
      has_rental_income: hasRentalIncome ?? false,
      has_bankruptcy: hasBankruptcy ?? false,
      has_foreclosure: hasForeclosure ?? false,
      has_child_support: hasChildSupport ?? false,
      ai_status: 'idle',
    })
    .select()
    .single()

  if (loanErr || !loan) {
    console.error('Loan create error:', loanErr)
    // Clean up client if loan fails
    await adminSupabase.from('clients').delete().eq('id', client.id)
    return NextResponse.json({ error: 'Failed to create loan record' }, { status: 500 })
  }

  // 3. Generate doc checklist via the engine
  const profile: LoanProfile = {
    loanType,
    loanPurpose,
    employmentType,
    coBorrower: coBorrower ?? false,
    coBorrowerEmploymentType: coBorrowerEmploymentType ?? undefined,
    propertyType,
    propertyUse,
    hasGiftFunds: hasGiftFunds ?? false,
    hasRentalIncome: hasRentalIncome ?? false,
    hasBankruptcy: hasBankruptcy ?? false,
    hasForeclosure: hasForeclosure ?? false,
    hasChildSupport: hasChildSupport ?? false,
    yearsEmployed: yearsEmployed ?? undefined,
  }

  const checklist = generateDocChecklist(profile)
  const summary = summarizeChecklist(checklist)

  // 4. Insert all document requests
  const docRows = checklist.map(doc => ({
    client_id: client.id,
    loan_id: loan.id,
    label: doc.label,
    required: doc.required,
    category: doc.category,
    status: 'missing',
    notes: doc.hint ?? null,
  }))

  const { error: docErr } = await adminSupabase
    .from('document_requests')
    .insert(docRows)

  if (docErr) {
    console.error('Doc insert error:', docErr)
    return NextResponse.json({ error: 'Failed to generate document checklist' }, { status: 500 })
  }

  // 5. Log activity
  await logActivity(client.id, 'loan_submitted', `New ${loanType.toUpperCase()} ${loanPurpose} loan submitted. ${summary}`)

  // 6. Send invite email to borrower
  try {
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/client/upload/${client.invite_token}`
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const toEmail = process.env.NODE_ENV === 'production' ? email : (process.env.RESEND_TEST_EMAIL ?? email)

    await resend.emails.send({
      from: 'WireChase <onboarding@resend.dev>',
      to: toEmail,
      subject: `Action Required — Upload Your Loan Documents`,
      html: `
        <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #111;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:28px;">
            <div style="background:#3b82f6; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
              <span style="color:white; font-weight:bold; font-size:16px;">W</span>
            </div>
            <span style="font-weight:bold; font-size:18px;">WireChase</span>
          </div>

          <h2 style="margin:0 0 8px; font-size:22px;">Hi ${fullName}, let's get your documents together</h2>
          <p style="color:#6b7280; margin:0 0 20px; font-size:15px;">
            Your loan officer has submitted your loan application. To keep things moving, 
            please upload the required documents using the secure link below.
          </p>

          <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:12px; padding:16px 20px; margin-bottom:24px;">
            <p style="margin:0; font-size:13px; color:#0369a1; font-weight:600;">📋 What we need from you:</p>
            <p style="margin:4px 0 0; font-size:13px; color:#0284c7;">${summary}</p>
          </div>

          <a href="${inviteLink}" 
             style="display:inline-block; background:#2563eb; color:white; text-decoration:none; 
                    padding:14px 32px; border-radius:10px; font-weight:700; font-size:15px; margin-bottom:28px;">
            Upload My Documents →
          </a>

          <p style="color:#9ca3af; font-size:12px; margin:0 0 4px;">This link is secure and unique to you. No account needed.</p>
          <p style="color:#9ca3af; font-size:12px; margin:0;">If you have questions, contact your loan officer directly.</p>

          <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;"/>
          <p style="color:#d1d5db; font-size:11px; margin:0;">WireChase · Secure Mortgage Document Collection</p>
        </div>
      `,
    })
  } catch (emailErr) {
    console.error('Invite email failed (non-fatal):', emailErr)
    // Don't fail the whole request for email errors
  }

  // 7. Send co-borrower invite if applicable
  if (coBorrower && coBorrowerEmail && loan.co_borrower_invite_token) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const coInviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/coborrower/upload/${loan.co_borrower_invite_token}`
      const toEmail = process.env.NODE_ENV === 'production' ? coBorrowerEmail : (process.env.RESEND_TEST_EMAIL ?? coBorrowerEmail)

      await resend.emails.send({
        from: 'WireChase <onboarding@resend.dev>',
        to: toEmail,
        subject: `Action Required — Upload Your Co-Borrower Documents`,
        html: `
          <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #111;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:28px;">
              <div style="background:#3b82f6; width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center;">
                <span style="color:white; font-weight:bold; font-size:16px;">W</span>
              </div>
              <span style="font-weight:bold; font-size:18px;">WireChase</span>
            </div>
            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:8px 14px; display:inline-block; margin-bottom:20px;">
              <span style="color:#1d4ed8; font-size:12px; font-weight:600;">Co-Borrower Portal</span>
            </div>
            <h2 style="margin:0 0 8px; font-size:22px;">Hi ${coBorrowerName}, you're a co-borrower</h2>
            <p style="color:#6b7280; margin:0 0 20px; font-size:15px;">
              You've been added as a co-borrower on <strong style="color:#111;">${fullName}'s</strong> loan application. 
              Please upload your required documents using the secure link below.
            </p>
            <a href="${coInviteLink}" 
               style="display:inline-block; background:#2563eb; color:white; text-decoration:none; 
                      padding:14px 32px; border-radius:10px; font-weight:700; font-size:15px; margin-bottom:28px;">
              Upload My Documents →
            </a>
            <p style="color:#9ca3af; font-size:12px; margin:0;">This link is secure and unique to you. No account needed.</p>
            <hr style="border:none; border-top:1px solid #e5e7eb; margin:28px 0;"/>
            <p style="color:#d1d5db; font-size:11px; margin:0;">WireChase · Secure Mortgage Document Collection</p>
          </div>
        `,
      })
    } catch (e) {
      console.error('Co-borrower invite email failed (non-fatal):', e)
    }
  }

  return NextResponse.json({
    success: true,
    clientId: client.id,
    loanId: loan.id,
    docsGenerated: checklist.length,
    summary,
  })
}
