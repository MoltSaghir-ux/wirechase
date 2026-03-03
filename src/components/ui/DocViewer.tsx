'use client'

import { useState } from 'react'

export default function DocViewer({ docId, fileName }: { docId: string; fileName: string }) {
  const [loading, setLoading] = useState(false)

  async function open(download = false) {
    setLoading(true)
    const res = await fetch(`/api/broker/doc-url?docId=${docId}`)
    const { url, error } = await res.json()
    setLoading(false)
    if (error || !url) { alert('Could not load document.'); return }
    if (download) {
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
    } else {
      window.open(url, '_blank')
    }
  }

  if (loading) return <span className="text-xs text-gray-400">Loading...</span>

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => open(false)}
        className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition"
      >
        View
      </button>
      <button
        onClick={() => open(true)}
        className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition"
      >
        Download
      </button>
    </div>
  )
}
