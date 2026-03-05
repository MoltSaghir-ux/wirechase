'use client'

import { useEffect, useState, useCallback } from 'react'
import { use } from 'react'

interface DocRequest {
  id: string
  label: string
  status: string
  required: boolean
  category: string
  notes: string | null
}

interface LoanData {
  id: string
  co_borrower_name: string
  co_borrower_email: string
  client_id: string
  loan_type: string
  clients: {
    full_name: string
    brokers: {
      full_name: string
      brokerages: { name: string; nmls: string | null } | null
    } | null
  } | null
  document_requests: DocRequest[]
}

export default function CoBorrowerUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [loan, setLoan] = useState<LoanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const fetchLoan = useCallback(async () => {
    if (!/^[a-zA-Z0-9\-]{10,100}$/.test(token)) {
      setError('Invalid link.')
      setLoading(false)
      return
    }
    const res = await fetch(`/api/coborrower/docs?token=${encodeURIComponent(token)}`)
    if (!res.ok) {
      setError('This link is invalid or has expired. Contact your loan officer.')
      setLoading(false)
      return
    }
    const data = await res.json()
    setLoan(data.loan)
    setLoading(false)
  }, [token])

  useEffect(() => { fetchLoan() }, [fetchLoan])

  async function handleUpload(docRequestId: string, file: File) {
    setUploading(docRequestId)
    setError('')
    const formData = new FormData()
    formData.append('token', token)
    formData.append('docRequestId', docRequestId)
    formData.append('file', file)
    formData.append('isCoBorrower', 'true')

    const res = await fetch('/api/client/upload', { method: 'POST', body: formData })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Upload failed. Try again.')
    } else {
      await fetchLoan()
    }
    setUploading(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading your document portal...</p>
    </div>
  )

  if (error && !loan) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-gray-800 font-semibold">{error}</p>
      </div>
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900">All done!</h2>
        <p className="text-gray-500 text-sm mt-2">Your documents have been submitted. Your loan officer has been notified.</p>
      </div>
    </div>
  )

  const docs = loan?.document_requests ?? []
  const categories = [...new Set(docs.map(d => d.category ?? 'Documents'))]
  const uploaded = docs.filter(d => d.status !== 'missing').length
  const pct = docs.length ? Math.round((uploaded / docs.length) * 100) : 0
  const allUploaded = docs.length > 0 && docs.every(d => d.status !== 'missing')

  const broker = loan?.clients?.brokers as any
  const brokerage = broker?.brokerages
  const displayName = brokerage?.name ?? 'WireChase'
  const primaryName = loan?.clients?.full_name ?? 'your co-borrower'

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-[#0f172a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{displayName.slice(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">{displayName}</h1>
            <p className="text-white/40 text-xs">
              {broker?.full_name ? `Your loan officer: ${broker.full_name}` : 'Secure Document Portal'}
              {brokerage?.nmls ? ` · NMLS #${brokerage.nmls}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          <span className="text-white/60 text-xs">Encrypted</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Co-Borrower Portal
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Hi, {loan?.co_borrower_name ?? 'there'} 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            You're a co-borrower on {primaryName}'s loan. Please upload your documents below.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">Your Progress</span>
            <span className="font-bold text-gray-900">{uploaded}/{docs.length} uploaded</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          {allUploaded && (
            <p className="text-green-600 text-sm font-medium mt-2">✓ All documents uploaded!</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}

        <div className="space-y-4 mb-6">
          {docs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <p className="text-gray-400 text-sm">No documents have been requested yet. Check back soon.</p>
            </div>
          ) : categories.map(cat => (
            <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {docs.filter(d => (d.category ?? 'Documents') === cat).map(doc => (
                  <div key={doc.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{doc.label}</p>
                        {doc.required && <span className="text-xs text-red-400">Required</span>}
                        {doc.notes && <p className="text-xs text-gray-400 mt-0.5">{doc.notes}</p>}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                        doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                        doc.status === 'uploaded' ? 'bg-blue-100 text-blue-700' :
                        doc.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {doc.status === 'missing' ? 'Needed' :
                         doc.status === 'approved' ? '✓ Approved' :
                         doc.status === 'rejected' ? '✕ Re-upload' : '✓ Uploaded'}
                      </span>
                    </div>

                    {(doc.status === 'missing' || doc.status === 'rejected') && (
                      <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl p-3 text-sm text-gray-400 cursor-pointer hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition ${uploading === doc.id ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleUpload(doc.id, file)
                          }}
                        />
                        {uploading === doc.id ? '⏳ Uploading...' : '📎 Click to upload · PDF, JPG, PNG (max 10MB)'}
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {allUploaded && docs.length > 0 && (
          <button
            onClick={() => setDone(true)}
            className="w-full bg-green-600 text-white rounded-2xl py-4 text-base font-bold hover:bg-green-700 transition shadow-sm"
          >
            ✓ Submit All Documents
          </button>
        )}

        <p className="text-center text-xs text-gray-300 mt-6">
          Your documents are encrypted and securely stored. Only your loan officer can access them.
        </p>
      </main>
    </div>
  )
}
