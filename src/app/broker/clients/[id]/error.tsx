'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ClientDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ClientDetail] Server error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-6">
          Could not load this client file. This is usually a temporary issue.
          {error.digest && <span className="block text-xs text-gray-300 mt-1">Ref: {error.digest}</span>}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-[#0f2240] text-white text-sm font-semibold rounded-lg hover:bg-[#1a3560] transition"
          >
            Try again
          </button>
          <Link
            href="/broker/dashboard"
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
