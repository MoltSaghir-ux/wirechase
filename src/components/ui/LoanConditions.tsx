'use client'

import { useState, useEffect } from 'react'

type ConditionStatus = 'open' | 'requested' | 'received' | 'submitted' | 'cleared'

type Condition = {
  id: string
  loan_id: string
  client_id: string
  condition_text: string
  category: string
  status: ConditionStatus
  source: string
  notes: string | null
  requested_at: string | null
  received_at: string | null
  submitted_at: string | null
  cleared_at: string | null
  created_at: string
}

const CATEGORIES = ['Income', 'Assets', 'Property', 'Credit', 'Insurance', 'Title', 'Other']

const CATEGORY_COLORS: Record<string, string> = {
  Income:    'bg-blue-100 text-blue-700',
  Assets:    'bg-purple-100 text-purple-700',
  Property:  'bg-orange-100 text-orange-700',
  Credit:    'bg-red-100 text-red-700',
  Insurance: 'bg-teal-100 text-teal-700',
  Title:     'bg-yellow-100 text-yellow-700',
  Other:     'bg-gray-100 text-gray-600',
}

const STATUS_CONFIG: Record<ConditionStatus, { label: string; color: string; dot: string; next: ConditionStatus | null; nextLabel: string | null }> = {
  open:      { label: 'Open',      color: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400',   next: 'requested', nextLabel: 'Request from Client' },
  requested: { label: 'Requested', color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500',   next: 'received',  nextLabel: 'Mark Received' },
  received:  { label: 'Received',  color: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500',  next: 'submitted', nextLabel: 'Mark Submitted' },
  submitted: { label: 'Submitted', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500', next: 'cleared',   nextLabel: 'Mark Cleared' },
  cleared:   { label: 'Cleared',   color: 'bg-green-100 text-green-700',   dot: 'bg-green-500',  next: null,        nextLabel: null },
}

export default function LoanConditions({ loanId, clientId }: { loanId: string; clientId: string }) {
  const [conditions, setConditions] = useState<Condition[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<ConditionStatus | 'all'>('all')
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  // Add form state
  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState('Other')
  const [newNotes, setNewNotes] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetch(`/api/conditions?loanId=${loanId}`)
      .then(r => r.json())
      .then(d => { setConditions(d.conditions ?? []); setLoading(false) })
  }, [loanId])

  async function addCondition() {
    if (!newText.trim()) return
    setAdding(true)
    const res = await fetch('/api/conditions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loanId, clientId, conditionText: newText, category: newCategory, notes: newNotes }),
    })
    const data = await res.json()
    if (res.ok) {
      setConditions(prev => [...prev, data.condition])
      setNewText('')
      setNewCategory('Other')
      setNewNotes('')
      setShowAdd(false)
    }
    setAdding(false)
  }

  async function updateStatus(id: string, status: ConditionStatus) {
    const res = await fetch(`/api/conditions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (res.ok) setConditions(prev => prev.map(c => c.id === id ? data.condition : c))
  }

  async function deleteCondition(id: string) {
    if (!confirm('Delete this condition?')) return
    await fetch(`/api/conditions/${id}`, { method: 'DELETE' })
    setConditions(prev => prev.filter(c => c.id !== id))
  }

  async function saveNotes(id: string, notes: string) {
    const res = await fetch(`/api/conditions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    const data = await res.json()
    if (res.ok) setConditions(prev => prev.map(c => c.id === id ? data.condition : c))
  }

  function toggleNotes(id: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const open = conditions.filter(c => c.status === 'open').length
  const cleared = conditions.filter(c => c.status === 'cleared').length
  const total = conditions.length

  const filtered = filter === 'all' ? conditions : conditions.filter(c => c.status === filter)

  const daysOpen = (c: Condition) => Math.floor((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))

  if (loading) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="animate-pulse h-4 w-32 bg-gray-100 rounded" />
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-800 text-sm">UW Conditions</h3>
          <div className="flex items-center gap-1.5">
            {total > 0 && (
              <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">{total} total</span>
            )}
            {open > 0 && (
              <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />{open} open
              </span>
            )}
            {cleared > 0 && (
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />{cleared} cleared
              </span>
            )}
            {total === 0 && (
              <span className="text-xs text-gray-400">No conditions yet</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          + Add Condition
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 space-y-3">
          <h4 className="text-sm font-semibold text-blue-800">New Condition</h4>
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="e.g. Provide most recent 60-day bank statements for all accounts showing down payment funds"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
          />
          <div className="flex items-center gap-3">
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text"
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="Internal notes (optional)"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">Cancel</button>
            <button
              onClick={addCondition}
              disabled={adding || !newText.trim()}
              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add Condition'}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {total > 0 && (
        <div className="flex items-center gap-1 mb-4 flex-wrap">
          {(['all', 'open', 'requested', 'received', 'submitted', 'cleared'] as const).map(f => {
            const count = f === 'all' ? total : conditions.filter(c => c.status === f).length
            if (f !== 'all' && count === 0) return null
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition capitalize ${
                  filter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All' : f} {count > 0 && <span className="ml-0.5 opacity-70">({count})</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Conditions list */}
      {filtered.length === 0 && total === 0 && (
        <div className="text-center py-8">
          <div className="flex justify-center mb-2 text-gray-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">No conditions yet</p>
          <p className="text-xs text-gray-300 mt-0.5">Conditions will be added here when UW comes back</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(c => {
          const cfg = STATUS_CONFIG[c.status]
          const days = daysOpen(c)
          const notesExpanded = expandedNotes.has(c.id)

          return (
            <div key={c.id} className={`border rounded-xl p-4 transition ${c.status === 'cleared' ? 'border-gray-100 bg-gray-50/50 opacity-75' : 'border-gray-100 bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  {/* Category pill */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${CATEGORY_COLORS[c.category] ?? CATEGORY_COLORS.Other}`}>
                    {c.category}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm text-gray-800 leading-snug ${c.status === 'cleared' ? 'line-through text-gray-400' : ''}`}>
                      {c.condition_text}
                    </p>
                    {/* Timestamps */}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${cfg.dot}`} />{cfg.label}
                      </span>
                      {days > 0 && c.status !== 'cleared' && (
                        <span className={`text-[10px] ${days >= 14 ? 'text-red-400 font-semibold' : days >= 7 ? 'text-amber-500' : 'text-gray-400'}`}>
                          {days}d open
                        </span>
                      )}
                      {c.cleared_at && (
                        <span className="text-[10px] text-green-600">
                          Cleared {new Date(c.cleared_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {c.source !== 'manual' && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{c.source}</span>
                      )}
                    </div>
                    {/* Notes */}
                    {c.notes && !notesExpanded && (
                      <p className="text-xs text-gray-400 mt-1 truncate cursor-pointer hover:text-gray-600 flex items-center gap-1" onClick={() => toggleNotes(c.id)}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 inline mr-1 text-gray-400 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>{c.notes}
                      </p>
                    )}
                    {notesExpanded && (
                      <div className="mt-2">
                        <NoteEditor
                          initial={c.notes ?? ''}
                          onSave={val => { saveNotes(c.id, val); toggleNotes(c.id) }}
                          onCancel={() => toggleNotes(c.id)}
                        />
                      </div>
                    )}
                    {!c.notes && !notesExpanded && (
                      <button onClick={() => toggleNotes(c.id)} className="text-[10px] text-gray-300 hover:text-gray-500 mt-1 transition">+ add note</button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {cfg.next && (
                    <button
                      onClick={() => updateStatus(c.id, cfg.next!)}
                      className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-blue-700 transition whitespace-nowrap"
                    >
                      {cfg.nextLabel}
                    </button>
                  )}
                  {c.status === 'cleared' && (
                    <button
                      onClick={() => updateStatus(c.id, 'open')}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition"
                    >
                      Reopen
                    </button>
                  )}
                  <button
                    onClick={() => deleteCondition(c.id)}
                    className="text-xs text-gray-300 hover:text-red-400 px-1.5 py-1 rounded-lg transition"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary footer */}
      {total > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>{total} condition{total !== 1 ? 's' : ''} total</span>
          {total > 0 && (
            <span className={open === 0 ? 'text-green-600 font-semibold' : ''}>
              {open === 0 ? '✓ All conditions cleared' : `${total - cleared} remaining`}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Inline note editor sub-component
function NoteEditor({ initial, onSave, onCancel }: { initial: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(initial)
  return (
    <div className="space-y-2">
      <textarea
        value={val}
        onChange={e => setVal(e.target.value)}
        rows={2}
        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        autoFocus
      />
      <div className="flex gap-1.5">
        <button onClick={() => onSave(val)} className="text-xs bg-gray-800 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-gray-700 transition">Save</button>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition">Cancel</button>
      </div>
    </div>
  )
}
