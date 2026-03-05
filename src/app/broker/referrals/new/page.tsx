'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'

const TYPE_LABELS: Record<string, string> = {
  realtor: 'Realtor', builder: 'Builder', financial_advisor: 'Financial Advisor',
  attorney: 'Attorney', other: 'Other'
}

export default function NewReferralPartnerPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [partnerType, setPartnerType] = useState('realtor')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('Full name is required'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/referral-partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, company, email, phone, partner_type: partnerType, notes }),
    })
    if (res.ok) {
      router.push('/broker/referrals')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to save partner')
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email="" />
      <main className="flex-1">
        <div className="max-w-xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Add Referral Partner</h1>
            <p className="text-sm text-gray-400 mt-0.5">Add a realtor, builder, or other partner who refers loans to you.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Full Name *</label>
              <input
                value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Partner Type</label>
              <select value={partnerType} onChange={e => setPartnerType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Company</label>
              <input
                value={company} onChange={e => setCompany(e.target.value)}
                placeholder="Keller Williams"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Email</label>
                <input
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com" type="email"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Phone</label>
                <input
                  value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 000-0000" type="tel"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Notes</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-[#0f2240] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#1a3560] transition disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Partner'}
              </button>
              <button type="button" onClick={() => router.push('/broker/referrals')}
                className="px-5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
