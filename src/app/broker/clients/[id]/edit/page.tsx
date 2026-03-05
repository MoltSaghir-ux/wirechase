'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import Link from 'next/link'
import {
  LOAN_TYPE_LABELS, LOAN_PURPOSE_LABELS, EMPLOYMENT_TYPE_LABELS,
  PROPERTY_TYPE_LABELS, PROPERTY_USE_LABELS
} from '@/lib/loan-doc-engine'
import type { LoanType, LoanPurpose, EmploymentType, PropertyType, PropertyUse } from '@/lib/loan-doc-engine'
import AddressAutocomplete from '@/components/ui/AddressAutocomplete'

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  // Client fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('')
  const [deadline, setDeadline] = useState('')
  const [userEmail, setUserEmail] = useState('')

  // Loan fields
  const [loanId, setLoanId] = useState<string | null>(null)
  const [loanType, setLoanType] = useState<LoanType>('conventional')
  const [loanPurpose, setLoanPurpose] = useState<LoanPurpose>('purchase')
  const [loanAmount, setLoanAmount] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [employmentType, setEmploymentType] = useState<EmploymentType>('w2')
  const [yearsEmployed, setYearsEmployed] = useState('')
  const [propertyType, setPropertyType] = useState<PropertyType>('sfr')
  const [propertyUse, setPropertyUse] = useState<PropertyUse>('primary')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [coBorrower, setCoBorrower] = useState(false)
  const [coBorrowerName, setCoBorrowerName] = useState('')
  const [coBorrowerEmail, setCoBorrowerEmail] = useState('')
  const [coBorrowerEmploymentType, setCoBorrowerEmploymentType] = useState<EmploymentType>('w2')
  const [fileNumber, setFileNumber] = useState('')

  // UI state
  const [fetching, setFetching] = useState(true)
  const [savingClient, setSavingClient] = useState(false)
  const [savingLoan, setSavingLoan] = useState(false)
  const [clientMsg, setClientMsg] = useState('')
  const [loanMsg, setLoanMsg] = useState('')
  const [clientErr, setClientErr] = useState(false)
  const [loanErr, setLoanErr] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')

      const { data: brokerProfile } = await supabase.from('brokers').select('role, brokerage_id').eq('id', user.id).single()
      const isAdmin = brokerProfile?.role === 'admin'

      const clientQuery = supabase.from('clients').select('full_name, email, phone, status, deadline_at, brokerage_id, broker_id').eq('id', id)
      const { data: client } = isAdmin
        ? await clientQuery.eq('brokerage_id', brokerProfile?.brokerage_id).single()
        : await clientQuery.eq('broker_id', user.id).single()

      if (client) {
        setFullName(client.full_name)
        setEmail(client.email)
        setPhone(client.phone ?? '')
        setStatus(client.status)
        setDeadline(client.deadline_at ? new Date(client.deadline_at).toISOString().slice(0, 10) : '')
      }

      // Load loan
      const { data: loan } = await supabase
        .from('loans')
        .select('id, loan_type, loan_purpose, loan_amount, purchase_price, employment_type, years_employed, property_type, property_use, property_address, co_borrower, co_borrower_name, co_borrower_email, co_borrower_employment_type, file_number')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (loan) {
        setLoanId(loan.id)
        setLoanType((loan.loan_type as LoanType) ?? 'conventional')
        setLoanPurpose((loan.loan_purpose as LoanPurpose) ?? 'purchase')
        setLoanAmount(loan.loan_amount ? String(loan.loan_amount) : '')
        setPurchasePrice(loan.purchase_price ? String(loan.purchase_price) : '')
        setEmploymentType((loan.employment_type as EmploymentType) ?? 'w2')
        setYearsEmployed(loan.years_employed ? String(loan.years_employed) : '')
        setPropertyType((loan.property_type as PropertyType) ?? 'sfr')
        setPropertyUse((loan.property_use as PropertyUse) ?? 'primary')
        setPropertyAddress(loan.property_address ?? '')
        setCoBorrower(loan.co_borrower ?? false)
        setCoBorrowerName(loan.co_borrower_name ?? '')
        setCoBorrowerEmail(loan.co_borrower_email ?? '')
        setCoBorrowerEmploymentType((loan.co_borrower_employment_type as EmploymentType) ?? 'w2')
        setFileNumber(loan.file_number ?? '')
      }

      setFetching(false)
    }
    load()
  }, [id])

  async function handleSaveClient(e: React.FormEvent) {
    e.preventDefault()
    setSavingClient(true)
    setClientMsg('')
    const { error } = await supabase.from('clients').update({
      full_name: fullName.trim().slice(0, 100),
      email: email.trim().toLowerCase().slice(0, 200),
      phone: phone.trim() || null,
      deadline_at: deadline ? new Date(deadline).toISOString() : null,
      deadline_reminder_sent: false,
    }).eq('id', id)

    setClientErr(!!error)
    setClientMsg(error ? 'Failed to update client.' : 'Client info saved.')
    setSavingClient(false)
  }

  async function handleSaveLoan(e: React.FormEvent) {
    e.preventDefault()
    if (!loanId) return
    setSavingLoan(true)
    setLoanMsg('')

    const res = await fetch('/api/loans/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loanId,
        loanType, loanPurpose,
        loanAmount: loanAmount ? parseFloat(loanAmount.replace(/,/g, '')) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice.replace(/,/g, '')) : null,
        employmentType,
        yearsEmployed: yearsEmployed ? parseFloat(yearsEmployed) : null,
        propertyType, propertyUse,
        propertyAddress: propertyAddress.trim(),
        coBorrower,
        coBorrowerName: coBorrower ? coBorrowerName.trim() : null,
        coBorrowerEmail: coBorrower ? coBorrowerEmail.trim() : null,
        coBorrowerEmploymentType: coBorrower ? coBorrowerEmploymentType : null,
        fileNumber: fileNumber.trim() || null,
      }),
    })

    const data = await res.json()
    setLoanErr(!res.ok)
    setLoanMsg(res.ok ? 'Loan details saved.' : data.error ?? 'Failed to update loan.')
    setSavingLoan(false)
  }

  async function handleArchive() {
    if (!confirm('Archive this client? They will be hidden from the dashboard but not deleted.')) return
    await supabase.from('clients').update({ status: 'archived' }).eq('id', id)
    router.push('/broker/dashboard')
  }

  async function handleUnarchive() {
    await supabase.from('clients').update({ status: 'pending' }).eq('id', id)
    setStatus('pending')
    setClientMsg('Client restored to dashboard.')
    setClientErr(false)
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this client and all their data? This cannot be undone.')) return
    await supabase.from('clients').delete().eq('id', id)
    router.push('/broker/dashboard')
  }

  if (fetching) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={userEmail} />
      <main className="flex-1 px-8 py-8 max-w-2xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/broker/dashboard" className="hover:text-blue-600">Dashboard</Link>
          <span>/</span>
          <Link href={`/broker/clients/${id}`} className="hover:text-blue-600">{fullName}</Link>
          <span>/</span>
          <span className="text-gray-700">Edit</span>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit File</h2>

        {/* ── Client Info ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <h3 className="font-semibold text-gray-800 mb-4">Borrower Info</h3>
          <form onSubmit={handleSaveClient} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={100}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={200}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Doc Deadline</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {clientMsg && (
              <p className={`text-sm px-4 py-2.5 rounded-xl border ${clientErr ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>{clientMsg}</p>
            )}
            <button type="submit" disabled={savingClient}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
              {savingClient ? 'Saving...' : 'Save Borrower Info'}
            </button>
          </form>
        </div>

        {/* ── Loan Details ── */}
        {loanId && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
            <h3 className="font-semibold text-gray-800 mb-4">Loan Details</h3>
            <form onSubmit={handleSaveLoan} className="space-y-5">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">File Number</label>
                  <input type="text" value={fileNumber} onChange={e => setFileNumber(e.target.value)}
                    placeholder="WC-2026-0001"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(LOAN_TYPE_LABELS) as [LoanType, string][]).map(([k, v]) => (
                    <button type="button" key={k} onClick={() => setLoanType(k)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition ${loanType === k ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loan Purpose</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(LOAN_PURPOSE_LABELS) as [LoanPurpose, string][]).map(([k, v]) => (
                    <button type="button" key={k} onClick={() => setLoanPurpose(k)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition text-center ${loanPurpose === k ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{loanPurpose === 'purchase' ? 'Purchase Price' : 'Home Value'}</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">$</span>
                    <input type="text" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="450,000"
                      className="w-full border border-gray-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Loan Amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">$</span>
                    <input type="text" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} placeholder="360,000"
                      className="w-full border border-gray-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(EMPLOYMENT_TYPE_LABELS) as [EmploymentType, string][]).map(([k, v]) => (
                    <button type="button" key={k} onClick={() => setEmploymentType(k)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition text-left ${employmentType === k ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(PROPERTY_TYPE_LABELS) as [PropertyType, string][]).map(([k, v]) => (
                    <button type="button" key={k} onClick={() => setPropertyType(k)}
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
                    <button type="button" key={k} onClick={() => setPropertyUse(k)}
                      className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition text-center ${propertyUse === k ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Address</label>
                <AddressAutocomplete
                  value={propertyAddress}
                  onChange={setPropertyAddress}
                  placeholder="123 Main St, Detroit, MI 48201"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Co-borrower toggle */}
              <div className="border-t border-gray-100 pt-4">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <div onClick={() => setCoBorrower(!coBorrower)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${coBorrower ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${coBorrower ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Co-borrower on this loan</span>
                </label>

                {coBorrower && (
                  <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Co-Borrower Name</label>
                        <input type="text" value={coBorrowerName} onChange={e => setCoBorrowerName(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Co-Borrower Email</label>
                        <input type="email" value={coBorrowerEmail} onChange={e => setCoBorrowerEmail(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Co-Borrower Employment</label>
                      <select value={coBorrowerEmploymentType} onChange={e => setCoBorrowerEmploymentType(e.target.value as EmploymentType)}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {loanMsg && (
                <p className={`text-sm px-4 py-2.5 rounded-xl border ${loanErr ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>{loanMsg}</p>
              )}

              <button type="submit" disabled={savingLoan}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
                {savingLoan ? 'Saving...' : 'Save Loan Details'}
              </button>
            </form>
          </div>
        )}

        {/* ── Danger Zone ── */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
          <h3 className="font-semibold text-red-600 mb-4">Danger Zone</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{status === 'archived' ? 'Restore Client' : 'Archive Client'}</p>
                <p className="text-xs text-gray-400">{status === 'archived' ? 'Move back to active dashboard' : 'Hide from dashboard, keep all data'}</p>
              </div>
              {status === 'archived' ? (
                <button onClick={handleUnarchive} className="text-sm border border-green-300 text-green-700 bg-green-50 px-4 py-2 rounded-xl hover:bg-green-100 transition">Restore</button>
              ) : (
                <button onClick={handleArchive} className="text-sm border border-yellow-300 text-yellow-700 bg-yellow-50 px-4 py-2 rounded-xl hover:bg-yellow-100 transition">Archive</button>
              )}
            </div>
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Delete Client</p>
                <p className="text-xs text-gray-400">Permanently remove all data. Cannot be undone.</p>
              </div>
              <button onClick={handleDelete} className="text-sm border border-red-300 text-red-700 bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition">Delete</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
