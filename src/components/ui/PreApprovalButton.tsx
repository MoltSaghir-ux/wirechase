'use client'

import { useState } from 'react'

type Props = {
  loanId: string
  clientName: string
  loanAmount: number | null
  purchasePrice: number | null
  loanType: string
  loanPurpose: string
}

export default function PreApprovalButton({ loanId, clientName, loanAmount, purchasePrice, loanType, loanPurpose }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Letter customization
  const [approvedAmount, setApprovedAmount] = useState(String(loanAmount ?? purchasePrice ?? ''))
  const [propertyAddress, setPropertyAddress] = useState('')
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 90)
    return d.toISOString().slice(0, 10)
  })
  const [conditions, setConditions] = useState('This pre-approval is subject to satisfactory appraisal, title search, and final underwriting review.')
  const [loanOfficerName, setLoanOfficerName] = useState('')
  const [loanOfficerNmls, setLoanOfficerNmls] = useState('')
  const [brokerageName, setBrokerageName] = useState('')

  async function handleGenerate() {
    setLoading(true)
    const res = await fetch('/api/loans/pre-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loanId,
        approvedAmount: parseFloat(approvedAmount.replace(/,/g, '')) || 0,
        propertyAddress,
        expiryDate,
        conditions,
        loanOfficerName,
        loanOfficerNmls,
        brokerageName,
        loanType,
        loanPurpose,
        clientName,
      }),
    })
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PreApproval_${clientName.replace(/\s+/g, '_')}.html`
      a.click()
      URL.revokeObjectURL(url)
      setOpen(false)
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5"
      >
        📜 Pre-Approval Letter
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-lg">Generate Pre-Approval Letter</h3>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">For {clientName}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Approved Loan Amount <span className="text-red-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">$</span>
                  <input type="text" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject Property Address <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)}
                  placeholder="123 Main St, Detroit, MI 48201 — or leave blank for any property"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Letter Expiry Date</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Loan Officer Name</label>
                  <input type="text" value={loanOfficerName} onChange={e => setLoanOfficerName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">LO NMLS #</label>
                  <input type="text" value={loanOfficerNmls} onChange={e => setLoanOfficerNmls(e.target.value)}
                    placeholder="1234567"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Brokerage Name</label>
                <input type="text" value={brokerageName} onChange={e => setBrokerageName(e.target.value)}
                  placeholder="ABC Mortgage Brokers LLC"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Conditions / Disclaimer</label>
                <textarea value={conditions} onChange={e => setConditions(e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setOpen(false)}
                className="flex-1 text-sm text-gray-500 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleGenerate} disabled={loading || !approvedAmount}
                className="flex-1 text-sm bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 transition">
                {loading ? 'Generating...' : '⬇ Download Letter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
