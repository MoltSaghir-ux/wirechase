'use client'
import { useState } from 'react'

export default function LOERequestButton({ clientId, loanId }: { clientId: string; loanId?: string }) {
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    if (!topic.trim()) return
    setSending(true)
    await fetch('/api/loe-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, loanId, topic, details }),
    })
    setSending(false)
    setSent(true)
    setTimeout(() => { setOpen(false); setSent(false); setTopic(''); setDetails(''); window.location.reload() }, 1200)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
      >
        📝 Request LOE
      </button>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-800">Request Letter of Explanation</p>
        <button onClick={() => setOpen(false)} className="text-amber-400 hover:text-amber-600 text-lg leading-none">×</button>
      </div>
      <input
        placeholder="Topic (e.g. Large deposit on 1/15, Employment gap 2023)"
        value={topic}
        onChange={e => setTopic(e.target.value)}
        className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <textarea
        placeholder="Additional details for the borrower (optional)"
        value={details}
        onChange={e => setDetails(e.target.value)}
        rows={2}
        className="w-full border border-amber-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSend}
          disabled={sending || sent || !topic.trim()}
          className={`flex-1 text-sm font-semibold py-2 rounded-xl transition ${
            sent ? 'bg-green-100 text-green-700' : 'bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50'
          }`}
        >
          {sent ? '✓ Sent!' : sending ? 'Sending…' : 'Send Request + Email Borrower'}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl">Cancel</button>
      </div>
    </div>
  )
}
