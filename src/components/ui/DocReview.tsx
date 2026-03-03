'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DocReview({ docRequestId, currentStatus }: { docRequestId: string; currentStatus: string }) {
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(currentStatus === 'approved' || currentStatus === 'rejected' ? currentStatus : '')
  const router = useRouter()

  async function submit(action: 'approved' | 'rejected') {
    setLoading(true)
    const res = await fetch('/api/broker/review-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docRequestId, action, note: note.trim() }),
    })
    setLoading(false)
    if (res.ok) {
      setDone(action)
      setMode('idle')
      router.refresh()
    }
  }

  if (done === 'approved') return (
    <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">✓ Approved</span>
  )

  if (done === 'rejected') return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-red-500 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">✕ Rejected</span>
      <button onClick={() => { setDone(''); setMode('idle') }} className="text-xs text-gray-400 hover:text-gray-600">Undo</button>
    </div>
  )

  if (currentStatus !== 'uploaded') return null

  return (
    <div className="mt-3 ml-5">
      {mode === 'idle' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => submit('approved')}
            disabled={loading}
            className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition disabled:opacity-50"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => setMode('rejecting')}
            className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
          >
            ✕ Reject
          </button>
        </div>
      )}

      {mode === 'rejecting' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-red-700">Add a note for the client (optional)</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="e.g. Please upload a clearer copy — we need all pages visible."
            className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => submit('rejected')}
              disabled={loading}
              className="text-xs font-semibold text-white bg-red-600 px-3 py-1.5 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Reject & Notify Client'}
            </button>
            <button onClick={() => { setMode('idle'); setNote('') }} className="text-xs text-gray-400 hover:text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
