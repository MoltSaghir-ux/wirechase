// WireChase Loan Doc Engine
// Given a loan profile, generates the exact document checklist needed.
// This is the brain of the AI processor's doc-chasing logic.

export type LoanType = 'conventional' | 'fha' | 'va'
export type LoanPurpose = 'purchase' | 'refinance' | 'cashout'
export type EmploymentType = 'w2' | 'self_employed' | 'retired' | 'military' | 'other'
export type PropertyType = 'sfr' | 'condo' | 'multi_unit' | 'manufactured'
export type PropertyUse = 'primary' | 'secondary' | 'investment'

export interface LoanProfile {
  loanType: LoanType
  loanPurpose: LoanPurpose
  employmentType: EmploymentType
  coBorrower: boolean
  coBorrowerEmploymentType?: EmploymentType
  propertyType: PropertyType
  propertyUse: PropertyUse
  hasGiftFunds: boolean
  hasRentalIncome: boolean
  hasBankruptcy: boolean
  hasForeclosure: boolean
  hasChildSupport: boolean
  yearsEmployed?: number // < 2 triggers extra docs
}

export interface DocItem {
  label: string
  required: boolean
  category: string
  borrower?: 'primary' | 'co' | 'both' // who this doc applies to
  hint?: string // shown to borrower explaining what this is
}

// ─────────────────────────────────────────────
// Base doc blocks — reusable building blocks
// ─────────────────────────────────────────────

function identityDocs(prefix = ''): DocItem[] {
  const p = prefix ? `${prefix} — ` : ''
  return [
    { label: `${p}Government-Issued Photo ID`, required: true, category: 'Identity', hint: "Driver's license, passport, or state ID" },
    { label: `${p}Social Security Card or ITIN Letter`, required: true, category: 'Identity', hint: 'Must show full SSN' },
  ]
}

function w2IncomeDocs(prefix = ''): DocItem[] {
  const p = prefix ? `${prefix} — ` : ''
  return [
    { label: `${p}Pay Stubs (Most Recent 30 Days)`, required: true, category: 'Income', hint: 'Must show year-to-date earnings' },
    { label: `${p}W-2 Forms (Last 2 Years)`, required: true, category: 'Income', hint: 'All W-2s from all employers' },
    { label: `${p}Federal Tax Returns (Last 2 Years, All Pages)`, required: true, category: 'Income', hint: 'Including all schedules' },
  ]
}

function selfEmployedIncomeDocs(prefix = ''): DocItem[] {
  const p = prefix ? `${prefix} — ` : ''
  return [
    { label: `${p}Personal Federal Tax Returns (Last 2 Years, All Pages + Schedules)`, required: true, category: 'Income', hint: 'Must include all schedules (C, E, F if applicable)' },
    { label: `${p}Business Federal Tax Returns (Last 2 Years, All Pages)`, required: true, category: 'Income', hint: 'Partnership (1065), S-Corp (1120S), or C-Corp (1120)' },
    { label: `${p}YTD Profit & Loss Statement`, required: true, category: 'Income', hint: 'CPA-prepared or signed by you, current within 60 days' },
    { label: `${p}Business Bank Statements (Last 3 Months, All Pages)`, required: true, category: 'Income' },
    { label: `${p}Business License or CPA Letter`, required: true, category: 'Income', hint: 'Verifies business has been operating 2+ years' },
    { label: `${p}1099 Forms (Last 2 Years)`, required: false, category: 'Income' },
  ]
}

function retiredIncomeDocs(prefix = ''): DocItem[] {
  const p = prefix ? `${prefix} — ` : ''
  return [
    { label: `${p}Social Security Award Letter or Benefits Statement`, required: true, category: 'Income', hint: 'Must be dated within 12 months' },
    { label: `${p}Pension / Retirement Award Letter`, required: false, category: 'Income' },
    { label: `${p}Federal Tax Returns (Last 2 Years)`, required: true, category: 'Income' },
    { label: `${p}IRA / 401(k) / Investment Account Statements (Last 3 Months)`, required: false, category: 'Income' },
  ]
}

function militaryIncomeDocs(prefix = ''): DocItem[] {
  const p = prefix ? `${prefix} — ` : ''
  return [
    { label: `${p}Leave and Earnings Statement (LES)`, required: true, category: 'Income', hint: 'Most recent 30-day LES' },
    { label: `${p}W-2 Forms (Last 2 Years)`, required: true, category: 'Income' },
    { label: `${p}Federal Tax Returns (Last 2 Years)`, required: true, category: 'Income' },
    { label: `${p}VA Disability Award Letter`, required: false, category: 'Income', hint: 'If receiving VA disability compensation' },
  ]
}

function assetDocs(bankMonths = 2, includeInvestments = false): DocItem[] {
  const docs: DocItem[] = [
    {
      label: `Bank Statements — Checking & Savings (Last ${bankMonths} Months, All Pages)`,
      required: true,
      category: 'Assets',
      hint: 'Must include all pages, even blank ones. All accounts used for down payment/closing',
    },
    { label: 'Proof of Earnest Money Deposit', required: true, category: 'Assets', hint: 'Bank statement or cancelled check showing the EMD cleared' },
  ]
  if (includeInvestments) {
    docs.push({ label: 'Brokerage / Investment Account Statements (Last 3 Months)', required: true, category: 'Assets' })
    docs.push({ label: 'Retirement Account Statements — 401k/IRA (Last 3 Months)', required: false, category: 'Assets' })
  }
  return docs
}

function purchasePropertyDocs(): DocItem[] {
  return [
    { label: 'Signed Purchase Agreement / Sales Contract', required: true, category: 'Property', hint: 'Fully executed with all addenda and counters' },
    { label: 'Homeowners Insurance Binder or Quote', required: true, category: 'Property', hint: "Contact your insurance agent — we'll need the policy before closing" },
  ]
}

function refinancePropertyDocs(): DocItem[] {
  return [
    { label: 'Current Mortgage Statement (Most Recent)', required: true, category: 'Property', hint: 'Must show loan balance, payment, and lender info' },
    { label: 'Homeowners Insurance Declaration Page', required: true, category: 'Property', hint: 'The full declarations page, not just the binder' },
    { label: 'Most Recent Property Tax Bill or Statement', required: true, category: 'Property' },
  ]
}

// ─────────────────────────────────────────────
// Main engine
// ─────────────────────────────────────────────

export function generateDocChecklist(profile: LoanProfile): DocItem[] {
  const docs: DocItem[] = []

  // ── Identity ──────────────────────────────────────────────────
  docs.push(...identityDocs())
  if (profile.coBorrower) {
    docs.push(...identityDocs('Co-Borrower'))
  }

  // ── Primary borrower income ────────────────────────────────────
  switch (profile.employmentType) {
    case 'w2':
      docs.push(...w2IncomeDocs())
      if (profile.yearsEmployed !== undefined && profile.yearsEmployed < 2) {
        docs.push({ label: 'Previous Employer W-2 or Transcripts (Gap Explanation)', required: true, category: 'Income', hint: 'Less than 2 years at current employer — we need history' })
        docs.push({ label: 'Written Explanation of Employment Gap', required: true, category: 'Income' })
      }
      break
    case 'self_employed':
      docs.push(...selfEmployedIncomeDocs())
      break
    case 'retired':
      docs.push(...retiredIncomeDocs())
      break
    case 'military':
      docs.push(...militaryIncomeDocs())
      break
    default:
      docs.push(...w2IncomeDocs()) // fallback
      docs.push({ label: 'Income Documentation (Other Source)', required: true, category: 'Income', hint: 'Please provide documentation of your income source' })
  }

  // ── Co-borrower income ─────────────────────────────────────────
  if (profile.coBorrower && profile.coBorrowerEmploymentType) {
    switch (profile.coBorrowerEmploymentType) {
      case 'w2':
        docs.push(...w2IncomeDocs('Co-Borrower'))
        break
      case 'self_employed':
        docs.push(...selfEmployedIncomeDocs('Co-Borrower'))
        break
      case 'retired':
        docs.push(...retiredIncomeDocs('Co-Borrower'))
        break
      case 'military':
        docs.push(...militaryIncomeDocs('Co-Borrower'))
        break
    }
  }

  // ── Assets ────────────────────────────────────────────────────
  const bankMonths = profile.loanType === 'conventional' && profile.propertyUse === 'investment' ? 3 : 2
  docs.push(...assetDocs(bankMonths, profile.propertyUse !== 'primary'))

  // ── Property ─────────────────────────────────────────────────
  if (profile.loanPurpose === 'purchase') {
    docs.push(...purchasePropertyDocs())
  } else {
    docs.push(...refinancePropertyDocs())
    if (profile.loanPurpose === 'cashout') {
      docs.push({ label: 'Statement of Purpose for Cash-Out Funds', required: true, category: 'Property', hint: 'Explain how you plan to use the cash (home improvement, debt payoff, etc.)' })
    }
  }

  // Condo-specific
  if (profile.propertyType === 'condo') {
    docs.push({ label: 'HOA Contact Information and Master Insurance Policy', required: true, category: 'Property', hint: 'The full HOA master policy, not just the unit policy' })
    docs.push({ label: 'HOA Budget and Meeting Minutes (Last 2 Years)', required: false, category: 'Property' })
    docs.push({ label: 'Condo Questionnaire (lender will provide form)', required: true, category: 'Property' })
  }

  // Multi-unit
  if (profile.propertyType === 'multi_unit') {
    docs.push({ label: 'Current Leases for All Occupied Units', required: true, category: 'Property' })
    docs.push({ label: 'Rental Income History / Schedule E', required: true, category: 'Income' })
  }

  // ── Loan-type specific ───────────────────────────────────────

  if (profile.loanType === 'fha') {
    docs.push({ label: 'FHA Case Number Assignment (provided by lender)', required: true, category: 'FHA Specifics', hint: "We'll order this for you — just a heads up it's required" })
    docs.push({ label: 'FHA-Approved Property Appraisal', required: true, category: 'FHA Specifics', hint: 'Must be ordered through an FHA-approved appraiser' })
  }

  if (profile.loanType === 'va') {
    docs.push({ label: 'Certificate of Eligibility (COE)', required: true, category: 'VA Specifics', hint: 'We can often pull this electronically — check with your LO' })
    docs.push({ label: 'DD-214 (Certificate of Release / Discharge from Active Duty)', required: true, category: 'VA Specifics', hint: 'Member 4 copy preferred. Active duty: provide Statement of Service instead' })
    docs.push({ label: 'Statement of Service Letter (active duty only)', required: false, category: 'VA Specifics', hint: 'From your commanding officer — required if currently active duty' })
    docs.push({ label: 'VA Appraisal (ordered by lender)', required: true, category: 'VA Specifics', hint: "We'll order this through the VA portal — no action needed from you yet" })
    docs.push({ label: 'VA Disability Award Letter', required: false, category: 'VA Specifics', hint: 'If receiving VA disability — this income may be tax-free and help qualify' })
    docs.push({ label: 'Termite / Pest Inspection Report', required: false, category: 'VA Specifics', hint: 'Required in most states for VA loans' })
  }

  // ── Special circumstances ────────────────────────────────────

  if (profile.hasGiftFunds) {
    const giftDoc: DocItem = { label: 'Gift Letter (signed by donor)', required: true, category: 'Assets', hint: 'Must include donor name, relationship, amount, and statement that repayment is not expected' }
    if (profile.loanType === 'fha') giftDoc.hint += '. FHA allows 100% gift funds for down payment.'
    docs.push(giftDoc)
    docs.push({ label: "Gift Funds Bank Statement (showing donor's withdrawal + your deposit)", required: true, category: 'Assets' })
  }

  if (profile.hasRentalIncome) {
    docs.push({ label: 'Current Lease Agreements (All Rental Properties)', required: true, category: 'Income' })
    docs.push({ label: 'Schedule E from Federal Tax Returns', required: true, category: 'Income', hint: 'Shows rental income/loss history' })
    docs.push({ label: 'Mortgage Statements for All Rental Properties', required: true, category: 'Liabilities' })
  }

  if (profile.hasBankruptcy) {
    docs.push({ label: 'Bankruptcy Discharge Papers (All Chapters)', required: true, category: 'Credit History', hint: 'Must show discharge date — seasoning requirements vary by loan type' })
    docs.push({ label: 'Explanation Letter for Bankruptcy', required: true, category: 'Credit History', hint: 'Brief letter explaining what led to bankruptcy and how situation has improved' })
  }

  if (profile.hasForeclosure) {
    docs.push({ label: 'Foreclosure / Short Sale Documentation', required: true, category: 'Credit History', hint: 'Deed-in-lieu, short sale HUD-1, or foreclosure completion notice' })
    docs.push({ label: 'Explanation Letter for Foreclosure / Short Sale', required: true, category: 'Credit History' })
  }

  if (profile.hasChildSupport) {
    docs.push({ label: 'Divorce Decree / Separation Agreement', required: true, category: 'Liabilities', hint: 'Full document including all financial terms' })
    docs.push({ label: 'Child Support / Alimony Payment History (12 Months)', required: true, category: 'Liabilities', hint: 'Bank statements or cancelled checks showing consistent payments' })
  }

  // Investment property extra
  if (profile.propertyUse === 'investment') {
    docs.push({ label: 'Investment Property Rental Analysis / Market Rent Appraisal', required: false, category: 'Property', hint: 'Shows projected rental income — helps with qualifying' })
    docs.push({ label: 'Property Management Agreement (if applicable)', required: false, category: 'Property' })
  }

  // Secondary home
  if (profile.propertyUse === 'secondary') {
    docs.push({ label: 'Primary Residence Mortgage Statement or Lease', required: true, category: 'Liabilities', hint: 'Proves your primary housing obligation' })
    docs.push({ label: 'Written Explanation for Second Home (distance / use)', required: false, category: 'Property', hint: 'UW may request this — explain why you need a second home' })
  }

  // Deduplicate by label (in case co-borrower adds something already in primary)
  const seen = new Set<string>()
  return docs.filter(d => {
    if (seen.has(d.label)) return false
    seen.add(d.label)
    return true
  })
}

// ─────────────────────────────────────────────
// Human-readable summary of what was generated
// ─────────────────────────────────────────────
export function summarizeChecklist(docs: DocItem[]): string {
  const required = docs.filter(d => d.required).length
  const total = docs.length
  const categories = [...new Set(docs.map(d => d.category))]
  return `${total} documents (${required} required) across ${categories.length} categories: ${categories.join(', ')}`
}

// ─────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────
export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  conventional: 'Conventional',
  fha: 'FHA',
  va: 'VA',
}

export const LOAN_PURPOSE_LABELS: Record<LoanPurpose, string> = {
  purchase: 'Purchase',
  refinance: 'Refinance (Rate & Term)',
  cashout: 'Cash-Out Refinance',
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  w2: 'W-2 Employee',
  self_employed: 'Self-Employed',
  retired: 'Retired',
  military: 'Military / Active Duty',
  other: 'Other',
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  sfr: 'Single Family Home',
  condo: 'Condo / Townhome',
  multi_unit: '2-4 Unit Property',
  manufactured: 'Manufactured / Mobile Home',
}

export const PROPERTY_USE_LABELS: Record<PropertyUse, string> = {
  primary: 'Primary Residence',
  secondary: 'Second / Vacation Home',
  investment: 'Investment Property',
}
