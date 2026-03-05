'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BulkApproveButton({ docIds }: { docIds: string[] }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleApproveAll() {
    if (!confirm(`Approve all ${docIds.length} uploaded document(s)?`)) return
    setLoading(true)
    await Promise.all(
      docIds.map(id =>
        fetch('/api/broker/review-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docRequestId: id, action: 'approved' }),
        })
      )
    )
    setLoading(false)
    setDone(true)
    setTimeout(() => { router.refresh(); setDone(false) }, 800)
  }

  return (
    <button
      onClick={handleApproveAll}
      disabled={loading || done}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
        done
          ? 'bg-green-100 text-green-700'
          : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
      }`}
    >
      {done ? '✓ All Approved' : loading ? 'Approving…' : `Approve All (${docIds.length})`}
    </button>
  )
}
