'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { MORTGAGE_PROGRAMS } from '@/lib/mortgage-programs'

export default function AddDocDropdown({ clientId, existingLabels, onAdded }: {
  clientId: string
  existingLabels: string[]
  onAdded: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const allPresets = MORTGAGE_PROGRAMS.flatMap(p =>
    p.docs.map(d => ({ label: d.label, category: d.category, program: p.name }))
  ).filter((p, i, arr) => arr.findIndex(x => x.label === p.label) === i)

  const available = allPresets
    .filter(p => !existingLabels.includes(p.label))
    .filter(p => !search || p.label.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))

  async function addDoc(label: string, category: string) {
    await supabase.from('document_requests').insert({ client_id: clientId, label, category, required: false })
    setOpen(false)
    setSearch('')
    onAdded()
  }

  async function addCustom() {
    if (!search.trim()) return
    await supabase.from('document_requests').insert({ client_id: clientId, label: search.trim().slice(0, 200), category: 'Custom', required: false })
    setOpen(false)
    setSearch('')
    onAdded()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
      >
        + Add Document
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-50 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search or type custom doc..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {available.length === 0 && !search && (
              <p className="px-4 py-3 text-sm text-gray-400">All standard docs already added.</p>
            )}
            {available.map((p, i) => (
              <button
                key={i}
                onClick={() => addDoc(p.label, p.category)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 transition"
              >
                <p className="text-gray-800">{p.label}</p>
                <p className="text-xs text-gray-400">{p.category} · {p.program}</p>
              </button>
            ))}
            {search.trim() && !available.find(p => p.label.toLowerCase() === search.toLowerCase()) && (
              <button
                onClick={addCustom}
                className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 text-blue-600 border-t border-gray-100"
              >
                + Add "{search.trim()}" as custom document
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
