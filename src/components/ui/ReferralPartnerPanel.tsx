'use client'
import { useState } from 'react'

type Partner = {
  id: string
  full_name: string
  company?: string
  email?: string
  phone?: string
  partner_type?: string
}

const TYPE_LABELS: Record<string, string> = {
  realtor: 'Realtor', builder: 'Builder', financial_advisor: 'Financial Advisor',
  attorney: 'Attorney', other: 'Other'
}

export default function ReferralPartnerPanel({
  loanId,
  currentPartnerId,
  currentPartnerName,
  referralNotes,
}: {
  loanId: string
  currentPartnerId?: string | null
  currentPartnerName?: string | null
  referralNotes?: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(currentPartnerId ?? '')
  const [notes, setNotes] = useState(referralNotes ?? '')
  const [saving, setSaving] = useState(false)

  // Show add-new partner mini form
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newType, setNewType] = useState('realtor')

  async function loadPartners() {
    setLoading(true)
    const res = await fetch('/api/referral-partners')
    const data = await res.json()
    setPartners(data)
    setLoading(false)
  }

  async function handleEdit() {
    setEditing(true)
    await loadPartners()
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/loans/set-referral', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanId, referralPartnerId: selectedId || null, referralNotes: notes }),
    })
    setSaving(false)
    setEditing(false)
    window.location.reload()
  }

  async function handleAddPartner() {
    if (!newName.trim()) return
    const res = await fetch('/api/referral-partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: newName, company: newCompany, email: newEmail, phone: newPhone, partner_type: newType }),
    })
    const created = await res.json()
    setPartners(prev => [...prev, created])
    setSelectedId(created.id)
    setShowAdd(false)
    setNewName(''); setNewCompany(''); setNewEmail(''); setNewPhone(''); setNewType('realtor')
  }

  if (!editing) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Referral Partner</h3>
          <button onClick={handleEdit} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
            {currentPartnerName ? 'Change' : '+ Assign'}
          </button>
        </div>
        {currentPartnerName ? (
          <div>
            <p className="font-semibold text-gray-900 text-sm">{currentPartnerName}</p>
            {referralNotes && <p className="text-xs text-gray-400 mt-1">{referralNotes}</p>}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No referral partner assigned.</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Assign Referral Partner</h3>

      {loading ? (
        <p className="text-xs text-gray-400">Loading partners…</p>
      ) : (
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— None —</option>
          {partners.map(p => (
            <option key={p.id} value={p.id}>
              {p.full_name}{p.company ? ` · ${p.company}` : ''} ({TYPE_LABELS[p.partner_type ?? 'other'] ?? p.partner_type})
            </option>
          ))}
        </select>
      )}

      <button onClick={() => setShowAdd(v => !v)} className="text-xs text-blue-600 hover:underline">
        {showAdd ? '— Cancel new partner' : '+ Add new partner'}
      </button>

      {showAdd && (
        <div className="space-y-2 bg-gray-50 rounded-xl p-3">
          <input placeholder="Full name *" value={newName} onChange={e => setNewName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Company" value={newCompany} onChange={e => setNewCompany(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input placeholder="Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={newType} onChange={e => setNewType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={handleAddPartner}
            className="w-full bg-blue-600 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-blue-700 transition">
            Save Partner
          </button>
        </div>
      )}

      <div>
        <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)}
          className="px-4 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl">
          Cancel
        </button>
      </div>
    </div>
  )
}
