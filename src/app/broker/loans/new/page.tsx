'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import Link from 'next/link'
import { LOAN_TYPE_LABELS, LOAN_PURPOSE_LABELS, EMPLOYMENT_TYPE_LABELS, PROPERTY_TYPE_LABELS, PROPERTY_USE_LABELS } from '@/lib/loan-doc-engine'
import type { LoanType, LoanPurpose, EmploymentType, PropertyType, PropertyUse } from '@/lib/loan-doc-engine'
import AddressAutocomplete from '@/components/ui/AddressAutocomplete'

// We get the broker email from the page — but since this is a client component
// we fetch it via a small server prop trick
export default function NewLoanPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1 = borrower info, 2 = loan details, 3 = property, 4 = special circumstances

  // Borrower info
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Loan details
  const [loanType, setLoanType] = useState<LoanType>('conventional')
  const [loanPurpose, setLoanPurpose] = useState<LoanPurpose>('purchase')
  const [loanAmount, setLoanAmount] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [employmentType, setEmploymentType] = useState<EmploymentType>('w2')
  const [yearsEmployed, setYearsEmployed] = useState('')

  // Co-borrower
  const [coBorrower, setCoBorrower] = useState(false)
  const [coBorrowerName, setCoBorrowerName] = useState('')
  const [coBorrowerEmail, setCoBorrowerEmail] = useState('')
  const [coBorrowerEmploymentType, setCoBorrowerEmploymentType] = useState<EmploymentType>('w2')

  // Property
  const [propertyType, setPropertyType] = useState<PropertyType>('sfr')
  const [propertyUse, setPropertyUse] = useState<PropertyUse>('primary')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [rateLockExpiry, setRateLockExpiry] = useState('')
  const [closingDate, setClosingDate] = useState('')
  const [titleCompany, setTitleCompany] = useState('')

  // Special circumstances
  const [hasGiftFunds, setHasGiftFunds] = useState(false)
  const [hasRentalIncome, setHasRentalIncome] = useState(false)
  const [hasBankruptcy, setHasBankruptcy] = useState(false)
  const [hasForeclosure, setHasForeclosure] = useState(false)
  const [hasChildSupport, setHasChildSupport] = useState(false)

  const totalSteps = 4

  async function handleSubmit() {
    if (!fullName.trim() || !email.trim()) {
      setError('Borrower name and email are required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/loans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Borrower
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          // Loan
          loanType,
          loanPurpose,
          loanAmount: loanAmount ? parseFloat(loanAmount.replace(/,/g, '')) : null,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice.replace(/,/g, '')) : null,
          employmentType,
          yearsEmployed: yearsEmployed ? parseFloat(yearsEmployed) : null,
          // Co-borrower
          coBorrower,
          coBorrowerName: coBorrower ? coBorrowerName.trim() : null,
          coBorrowerEmail: coBorrower ? coBorrowerEmail.trim() : null,
          coBorrowerEmploymentType: coBorrower ? coBorrowerEmploymentType : null,
          // Property
          propertyType,
          propertyUse,
          propertyAddress: propertyAddress.trim(),
          rateLockExpiry: rateLockExpiry || null,
          closingDate: closingDate || null,
          titleCompany: titleCompany.trim() || null,
          // Special
          hasGiftFunds,
          hasRentalIncome,
          hasBankruptcy,
          hasForeclosure,
          hasChildSupport,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create loan')
      router.push(`/broker/clients/${data.clientId}`)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return fullName.trim().length > 0 && email.trim().includes('@')
    if (step === 2) return loanAmount.length > 0 || purchasePrice.length > 0
    return true
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email="" />
      <main className="flex-1 px-8 py-8 max-w-2xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/broker/dashboard" className="hover:text-blue-600">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">New Loan</span>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Submit New Loan</h2>
          <p className="text-gray-400 text-sm mt-0.5">WireChase will generate the exact document checklist based on the loan profile</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => s < step && setStep(s)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition ${
                  s === step ? 'bg-blue-600 text-white' :
                  s < step ? 'bg-green-500 text-white cursor-pointer' :
                  'bg-gray-200 text-gray-400'
                }`}
              >
                {s < step ? '✓' : s}
              </button>
              {s < totalSteps && <div className={`w-12 h-0.5 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="text-sm text-gray-400 ml-2">
            {step === 1 ? 'Borrower Info' : step === 2 ? 'Loan Details' : step === 3 ? 'Property' : 'Special Circumstances'}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          {/* ── Step 1: Borrower Info ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-800 text-lg">Borrower Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Legal Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Michael Smith"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="john@email.com"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Borrower will receive their document upload link here</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Co-borrower toggle */}
              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setCoBorrower(!coBorrower)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${coBorrower ? 'bg-blue-600' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${coBorrower ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">There is a co-borrower on this loan</span>
                </label>
              </div>

              {coBorrower && (
                <div className="bg-blue-50 rounded-xl p-4 space-y-4">
                  <h4 className="font-medium text-blue-800 text-sm">Co-Borrower Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Co-Borrower Full Name</label>
                    <input type="text" value={coBorrowerName} onChange={e => setCoBorrowerName(e.target.value)}
                      placeholder="Jane Marie Smith"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Co-Borrower Email</label>
                    <input type="email" value={coBorrowerEmail} onChange={e => setCoBorrowerEmail(e.target.value)}
                      placeholder="jane@email.com"
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Co-Borrower Employment Type</label>
                    <select value={coBorrowerEmploymentType} onChange={e => setCoBorrowerEmploymentType(e.target.value as EmploymentType)}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Loan Details ── */}
          {step === 2 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-800 text-lg">Loan Details</h3>

              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(LOAN_TYPE_LABELS) as [LoanType, string][]).map(([k, v]) => (
                  <button key={k} onClick={() => setLoanType(k)}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition ${loanType === k ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {v}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Loan Purpose</label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(LOAN_PURPOSE_LABELS) as [LoanPurpose, string][]).map(([k, v]) => (
                    <button key={k} onClick={() => setLoanPurpose(k)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition text-center ${loanPurpose === k ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {loanPurpose === 'purchase' ? 'Purchase Price' : 'Estimated Home Value'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">$</span>
                    <input type="text" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)}
                      placeholder="450,000"
                      className="w-full border border-gray-200 rounded-xl pl-7 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Loan Amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">$</span>
                    <input type="text" value={loanAmount} onChange={e => setLoanAmount(e.target.value)}
                      placeholder="360,000"
                      className="w-full border border-gray-200 rounded-xl pl-7 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Borrower Employment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(EMPLOYMENT_TYPE_LABELS) as [EmploymentType, string][]).map(([k, v]) => (
                    <button key={k} onClick={() => setEmploymentType(k)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition text-left ${employmentType === k ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {(employmentType === 'w2' || employmentType === 'other') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Years at Current Employer</label>
                  <input type="number" min="0" max="40" step="0.5" value={yearsEmployed} onChange={e => setYearsEmployed(e.target.value)}
                    placeholder="3.5"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {parseFloat(yearsEmployed) > 0 && parseFloat(yearsEmployed) < 2 && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ Less than 2 years — extra employment history docs will be required</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Property ── */}
          {step === 3 && (
            <div className="space-y-5">
              <h3 className="font-semibold text-gray-800 text-lg">Property Details</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(PROPERTY_TYPE_LABELS) as [PropertyType, string][]).map(([k, v]) => (
                    <button key={k} onClick={() => setPropertyType(k)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition text-left ${propertyType === k ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Property Use</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(PROPERTY_USE_LABELS) as [PropertyUse, string][]).map(([k, v]) => (
                    <button key={k} onClick={() => setPropertyUse(k)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition text-center ${propertyUse === k ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {v}
                    </button>
                  ))}
                </div>
                {propertyUse === 'investment' && (
                  <p className="text-xs text-amber-600 mt-1.5">⚠️ Investment properties require additional reserves documentation</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Address <span className="text-gray-400 font-normal">(if known)</span></label>
                <AddressAutocomplete
                  value={propertyAddress}
                  onChange={setPropertyAddress}
                  placeholder="123 Main St, Detroit, MI 48201"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Closing Date <span className="text-gray-400 font-normal">(if known)</span></label>
                  <input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Rate Lock Expiry <span className="text-gray-400 font-normal">(if known)</span></label>
                  <input type="date" value={rateLockExpiry} onChange={e => setRateLockExpiry(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title Company <span className="text-gray-400 font-normal">(if known)</span></label>
                <input type="text" value={titleCompany} onChange={e => setTitleCompany(e.target.value)}
                  placeholder="ABC Title & Escrow"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {propertyType === 'condo' && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-sm text-blue-700 font-medium">📋 Condo Note</p>
                  <p className="text-xs text-blue-600 mt-1">Condo loans require HOA documentation and a condo questionnaire. WireChase will automatically add these to the checklist.</p>
                </div>
              )}
              {propertyType === 'manufactured' && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-sm text-amber-700 font-medium">⚠️ Manufactured Home</p>
                  <p className="text-xs text-amber-600 mt-1">FHA and VA have specific requirements for manufactured homes. Verify the property meets HUD standards.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Special Circumstances ── */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 text-lg">Special Circumstances</h3>
              <p className="text-sm text-gray-400">Check everything that applies — this ensures the borrower gets the right document requests from the start.</p>

              {[
                { key: 'hasGiftFunds', label: 'Using Gift Funds for Down Payment', desc: 'Adds gift letter + donor bank statement requirements', value: hasGiftFunds, set: setHasGiftFunds },
                { key: 'hasRentalIncome', label: 'Has Rental Income from Other Properties', desc: 'Adds leases, Schedule E, and rental property mortgage statements', value: hasRentalIncome, set: setHasRentalIncome },
                { key: 'hasBankruptcy', label: 'Prior Bankruptcy', desc: 'Adds discharge papers and explanation letter', value: hasBankruptcy, set: setHasBankruptcy },
                { key: 'hasForeclosure', label: 'Prior Foreclosure or Short Sale', desc: 'Adds documentation and explanation letter', value: hasForeclosure, set: setHasForeclosure },
                { key: 'hasChildSupport', label: 'Paying or Receiving Child Support / Alimony', desc: 'Adds divorce decree and payment history', value: hasChildSupport, set: setHasChildSupport },
              ].map(item => (
                <label key={item.key} onClick={() => item.set(!item.value)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${item.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition ${item.value ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {item.value && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                </label>
              ))}

              {/* Preview count */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-2">
                <p className="text-sm font-medium text-gray-700">📋 Document Checklist Preview</p>
                <p className="text-xs text-gray-400 mt-1">
                  Based on: <strong>{LOAN_TYPE_LABELS[loanType]}</strong> · <strong>{LOAN_PURPOSE_LABELS[loanPurpose]}</strong> · <strong>{EMPLOYMENT_TYPE_LABELS[employmentType]}</strong>
                  {coBorrower ? ` + Co-Borrower (${EMPLOYMENT_TYPE_LABELS[coBorrowerEmploymentType]})` : ''}
                  {' · '}<strong>{PROPERTY_TYPE_LABELS[propertyType]}</strong> · <strong>{PROPERTY_USE_LABELS[propertyUse]}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1.5 font-medium">WireChase will generate the exact checklist when you submit →</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 1 ? (
              <button onClick={() => setStep(s => s - 1)} className="text-sm text-gray-500 hover:text-gray-700 font-medium">← Back</button>
            ) : (
              <Link href="/broker/dashboard" className="text-sm text-gray-400 hover:text-gray-600">Cancel</Link>
            )}

            {step < totalSteps ? (
              <button
                onClick={() => canProceed() && setStep(s => s + 1)}
                disabled={!canProceed()}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-70 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                    </svg>
                    Generating Checklist...
                  </>
                ) : '🚀 Submit Loan & Generate Checklist'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
