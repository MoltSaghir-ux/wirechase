import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const LOAN_TYPE_LABELS: Record<string, string> = {
  conventional: 'Conventional', fha: 'FHA', va: 'VA', usda: 'USDA Rural Development', jumbo: 'Jumbo',
}
const LOAN_PURPOSE_LABELS: Record<string, string> = {
  purchase: 'Purchase', refinance: 'Rate/Term Refinance', cashout: 'Cash-Out Refinance', heloc: 'Home Equity Line of Credit',
}

type TemplateId = 'full_approval' | 'conditional' | 'pre_qual'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const body = await req.json()
  const {
    clientName,
    approvedAmount,
    propertyAddress,
    expiryDate,
    conditions,
    loanOfficerName,
    loanOfficerNmls,
    loanOfficerPhone,
    loanOfficerEmail,
    brokerageName,
    brokerageNmls,
    loanType,
    loanPurpose,
    template = 'full_approval' as TemplateId,
    primaryColor,
  } = body

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const expiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0,
  }).format(approvedAmount)
  const loanTypeLabel = LOAN_TYPE_LABELS[loanType] ?? loanType ?? ''
  const purposeLabel = LOAN_PURPOSE_LABELS[loanPurpose] ?? loanPurpose ?? ''

  const TEMPLATE_CONFIG: Record<TemplateId, { badge: string; headline: string; bodyText: string; defaultColor: string }> = {
    full_approval: {
      badge: 'Pre-Approval Letter',
      headline: 'Mortgage Pre-Approval',
      bodyText: `This letter certifies that <strong>${clientName}</strong> has been pre-approved for a <strong>${loanTypeLabel} ${purposeLabel}</strong> mortgage loan`,
      defaultColor: '#1e40af',
    },
    conditional: {
      badge: 'Conditional Pre-Approval',
      headline: 'Conditional Mortgage Pre-Approval',
      bodyText: `This letter certifies that <strong>${clientName}</strong> has received a conditional pre-approval for a <strong>${loanTypeLabel} ${purposeLabel}</strong> mortgage loan`,
      defaultColor: '#d97706',
    },
    pre_qual: {
      badge: 'Pre-Qualification Letter',
      headline: 'Mortgage Pre-Qualification',
      bodyText: `This letter indicates that <strong>${clientName}</strong> has been pre-qualified based on preliminary information provided for a <strong>${loanTypeLabel} ${purposeLabel}</strong> mortgage loan. This is not a pre-approval and does not constitute a commitment to lend.`,
      defaultColor: '#6b7280',
    },
  }

  const config = TEMPLATE_CONFIG[template as TemplateId] ?? TEMPLATE_CONFIG.full_approval
  const color = primaryColor || config.defaultColor

  // Derive a light tint for badge/amount box backgrounds (20% opacity via hex approximation)
  // We'll just use the color directly with opacity in inline styles
  const isConditional = template === 'conditional'
  const isPreQual = template === 'pre_qual'

  // Amount box background: very light tint derived per template
  const amountBoxBg = isConditional ? '#fffbeb' : isPreQual ? '#f9fafb' : '#f0f9ff'
  const amountBoxBorder = isConditional ? '#fde68a' : isPreQual ? '#e5e7eb' : '#bae6fd'
  const amountLabelColor = isConditional ? '#92400e' : isPreQual ? '#6b7280' : '#0284c7'
  const amountValueColor = isConditional ? '#78350f' : isPreQual ? '#374151' : '#0c4a6e'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.badge} — ${clientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; color: #1a1a1a; background: #fff; }
    .page { max-width: 680px; margin: 0 auto; padding: 60px 60px; }
    .header { border-bottom: 3px solid ${color}; padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
    .brand { font-family: 'Arial', sans-serif; }
    .brand-name { font-size: 28px; font-weight: 900; color: ${color}; letter-spacing: -0.5px; }
    .brand-sub { font-size: 11px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }
    .date { font-size: 13px; color: #6b7280; text-align: right; }
    .badge { display: inline-block; background: ${color}22; color: ${color}; font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 6px 14px; border-radius: 4px; margin-bottom: 28px; border: 1px solid ${color}44; }
    h1 { font-size: 22px; font-weight: 700; color: #111; margin-bottom: 20px; }
    p { font-size: 15px; line-height: 1.8; color: #374151; margin-bottom: 16px; }
    .amount-box { background: ${amountBoxBg}; border: 2px solid ${color}; border-radius: 12px; padding: 20px 28px; margin: 28px 0; }
    .amount-label { font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; color: ${amountLabelColor}; letter-spacing: 1px; text-transform: uppercase; }
    .amount-value { font-size: 36px; font-weight: 900; color: ${amountValueColor}; margin-top: 4px; font-family: Arial, sans-serif; }
    .loan-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0; background: #f9fafb; border-radius: 8px; padding: 16px 20px; }
    .detail-item { }
    .detail-label { font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; color: #9ca3af; letter-spacing: 1px; text-transform: uppercase; }
    .detail-value { font-size: 14px; color: #111; font-weight: 600; margin-top: 2px; }
    .conditions { background: #fffbeb; border: 1px solid ${isConditional ? color : '#fde68a'}; border-radius: 8px; padding: 16px 20px; margin: 24px 0; font-size: 13px; color: #78350f; line-height: 1.7; ${isConditional ? 'border-width: 2px;' : ''} }
    .conditions strong { display: block; margin-bottom: 6px; font-family: Arial, sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .disclaimer { font-size: 13px; color: #9ca3af; line-height: 1.7; font-style: italic; margin-top: 16px; }
    .signature { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
    .sig-name { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 2px; }
    .sig-title { font-size: 13px; color: #6b7280; }
    .sig-nmls { font-size: 12px; color: #9ca3af; font-family: monospace; margin-top: 4px; }
    .sig-contact { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #f3f4f6; font-family: Arial, sans-serif; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="brand-name">${brokerageName || 'WireChase'}</div>
        <div class="brand-sub">Mortgage Professionals${brokerageNmls ? ` · NMLS# ${brokerageNmls}` : ''}</div>
      </div>
      <div class="date">${today}</div>
    </div>

    <div class="badge">${config.badge}</div>

    <h1>${config.headline}</h1>

    <p>To Whom It May Concern,</p>

    <p>
      ${config.bodyText}${propertyAddress ? ` for the property located at <strong>${propertyAddress}</strong>` : ''}.
    </p>

    <div class="amount-box">
      <div class="amount-label">${template === 'pre_qual' ? 'Pre-Qualified Amount' : template === 'conditional' ? 'Conditionally Approved Amount' : 'Pre-Approved Loan Amount'}</div>
      <div class="amount-value">${formattedAmount}</div>
    </div>

    <div class="loan-details">
      <div class="detail-item">
        <div class="detail-label">Loan Type</div>
        <div class="detail-value">${loanTypeLabel}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Loan Purpose</div>
        <div class="detail-value">${purposeLabel}</div>
      </div>
      ${expiry ? `
      <div class="detail-item">
        <div class="detail-label">Letter Valid Through</div>
        <div class="detail-value">${expiry}</div>
      </div>` : ''}
      ${propertyAddress ? `
      <div class="detail-item">
        <div class="detail-label">Subject Property</div>
        <div class="detail-value">${propertyAddress}</div>
      </div>` : ''}
    </div>

    ${template === 'full_approval' ? `
    <p>
      This pre-approval is based on the information provided by the applicant and is subject to satisfactory
      appraisal, title search, and final underwriting review. This letter does not constitute a commitment to lend.
    </p>` : ''}

    ${template === 'conditional' ? `
    <p>
      This conditional pre-approval is subject to the satisfaction of the following conditions prior to final loan commitment.
    </p>` : ''}

    ${template === 'pre_qual' ? `
    <p class="disclaimer">
      This pre-qualification is based on preliminary information provided by the applicant and has not been
      verified. It does not represent a commitment to lend or a guarantee of financing. A formal loan application
      and full underwriting review are required to obtain a pre-approval.
    </p>` : ''}

    ${conditions ? `
    <div class="conditions">
      <strong>${isConditional ? 'Conditions of Approval' : 'Conditions'}</strong>
      ${conditions}
    </div>` : ''}

    <div class="signature">
      <div class="sig-name">${loanOfficerName || 'Loan Officer'}</div>
      <div class="sig-title">Loan Officer${brokerageName ? ` · ${brokerageName}` : ''}</div>
      ${loanOfficerNmls ? `<div class="sig-nmls">NMLS# ${loanOfficerNmls}</div>` : ''}
      ${loanOfficerPhone ? `<div class="sig-contact">📞 ${loanOfficerPhone}</div>` : ''}
      ${loanOfficerEmail ? `<div class="sig-contact">✉ ${loanOfficerEmail}</div>` : ''}
    </div>

    <div class="footer">
      Generated by WireChase · ${today} · This is not a commitment to lend. All loans subject to credit approval.
    </div>
  </div>
</body>
</html>`

  const filename = `${config.badge.replace(/\s+/g, '_')}_${clientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
