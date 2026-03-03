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

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => open(false)}
        disabled={loading}
        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
      >
        {loading ? 'Loading...' : '👁 View'}
      </button>
      <span className="text-gray-200">|</span>
      <button
        onClick={() => open(true)}
        disabled={loading}
        className="text-xs text-gray-500 hover:underline disabled:opacity-50"
      >
        ⬇ Download
      </button>
    </div>
  )
}
