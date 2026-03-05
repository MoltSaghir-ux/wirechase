'use client'
import { useState } from 'react'

type Template = 'full_approval' | 'conditional' | 'pre_qual'

const TEMPLATES = [
  {
    id: 'full_approval' as Template,
    label: 'Full Pre-Approval',
    desc: 'Strongest — borrower has been approved',
    color: '#1e40af',
    accent: 'border-blue-500 bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'conditional' as Template,
    label: 'Conditional Approval',
    desc: 'Approved subject to conditions',
    color: '#d97706',
    accent: 'border-amber-500 bg-amber-50',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'pre_qual' as Template,
    label: 'Pre-Qualification',
    desc: 'Softest — preliminary qualification only',
    color: '#6b7280',
    accent: 'border-gray-400 bg-gray-50',
    badge: 'bg-gray-100 text-gray-600',
  },
]

export default function PreApprovalModal({
  loanId,
  clientName,
  loanAmount,
  propertyAddress,
  loanType,
  loanPurpose,
  brokerageName,
  onClose,
}: {
  loanId: string
  clientName: string
  loanAmount?: number
  propertyAddress?: string
  loanType?: string
  loanPurpose?: string
  brokerageName?: string
  onClose: () => void
}) {
  const [template, setTemplate] = useState<Template>('full_approval')
  const [amount, setAmount] = useState(loanAmount?.toString() ?? '')
  const [address, setAddress] = useState(propertyAddress ?? '')
  const [expiry, setExpiry] = useState('')
  const [conditions, setConditions] = useState('')
  const [loName, setLoName] = useState('')
  const [loNmls, setLoNmls] = useState('')
  const [loPhone, setLoPhone] = useState('')
  const [loEmail, setLoEmail] = useState('')
  const [brokName, setBrokName] = useState(brokerageName ?? '')
  const [brokNmls, setBrokNmls] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#1e40af')
  const [showBranding, setShowBranding] = useState(false)
  const [loading, setLoading] = useState(false)

  function selectTemplate(t: Template) {
    setTemplate(t)
    const tmpl = TEMPLATES.find(x => x.id === t)
    if (tmpl) setPrimaryColor(tmpl.color)
  }

  async function handleDownload() {
    setLoading(true)
    const res = await fetch('/api/loans/pre-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName,
        approvedAmount: Number(amount),
        propertyAddress: address,
        expiryDate: expiry,
        conditions,
        loanOfficerName: loName,
        loanOfficerNmls: loNmls,
        loanOfficerPhone: loPhone,
        loanOfficerEmail: loEmail,
        brokerageName: brokName,
        brokerageNmls: brokNmls,
        loanType,
        loanPurpose,
        template,
        primaryColor,
      }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download =
      res.headers.get('content-disposition')?.split('filename="')[1]?.replace('"', '') ??
      'PreApproval.html'
    a.click()
    URL.revokeObjectURL(url)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Generate Pre-Approval Letter</h2>
            <p className="text-xs text-gray-400 mt-0.5">For {clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Template selector */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-3">
              Letter Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t.id)}
                  className={`p-3 rounded-xl border-2 text-left transition ${
                    template === t.id ? t.accent + ' border-opacity-100' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${t.badge}`}>
                    {t.label}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Approved Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="450000"
              />
            </div>
          </div>

          {/* Property address */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Property Address</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main St, Detroit, MI 48201"
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">Letter Valid Through</label>
            <input
              type="date"
              value={expiry}
              onChange={e => setExpiry(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Conditions */}
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1.5">
              Conditions{' '}
              {template === 'conditional' && <span className="text-amber-500">*</span>}
            </label>
            <textarea
              value={conditions}
              onChange={e => setConditions(e.target.value)}
              rows={template === 'conditional' ? 4 : 2}
              placeholder={
                template === 'conditional'
                  ? 'e.g. Subject to satisfactory appraisal, verification of income and employment, and final underwriting approval.'
                  : 'Optional conditions or notes'
              }
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* LO Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Loan Officer Name</label>
              <input
                value={loName}
                onChange={e => setLoName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">LO NMLS#</label>
              <input
                value={loNmls}
                onChange={e => setLoNmls(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123456"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">LO Phone</label>
              <input
                value={loPhone}
                onChange={e => setLoPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 000-0000"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">LO Email</label>
              <input
                value={loEmail}
                onChange={e => setLoEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="jane@brokerage.com"
              />
            </div>
          </div>

          {/* Branding (collapsible) */}
          <div>
            <button
              onClick={() => setShowBranding(v => !v)}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showBranding ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              Branding &amp; Colors
            </button>
            {showBranding && (
              <div className="mt-3 space-y-3 bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Brokerage Name</label>
                    <input
                      value={brokName}
                      onChange={e => setBrokName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">Brokerage NMLS#</label>
                    <input
                      value={brokNmls}
                      onChange={e => setBrokNmls(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-gray-500">Brand Color</label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="h-8 w-16 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-xs text-gray-400 font-mono">{primaryColor}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleDownload}
            disabled={loading || !amount}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Generating…</span>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Download Letter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
