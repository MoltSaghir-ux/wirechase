'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { use } from 'react'


interface DocRequest {
  id: string
  label: string
  status: string
  required: boolean
  category: string
}

interface ClientData {
  id: string
  full_name: string
  status: string
  document_requests: DocRequest[]
  brokers: {
    full_name: string
    brokerages: { name: string; nmls: string | null } | null
  } | null
}

export default function ClientUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [client, setClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const supabase = createClient()

  const fetchClient = useCallback(async () => {
    if (!/^[a-zA-Z0-9\-]{10,100}$/.test(token)) {
      setError('Invalid link.')
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, status, document_requests (id, label, status, required, category), brokers (full_name, brokerages (name, nmls))')
      .eq('invite_token', token)
      .single()

    if (error || !data) {
      setError('This link is invalid or has expired.')
    } else {
      setClient(data as any)
      if (data.status === 'complete') setSubmitted(true)
    }
    setLoading(false)
  }, [token])

  useEffect(() => { fetchClient() }, [fetchClient])

  async function handleUpload(docRequestId: string, file: File) {
    setUploading(docRequestId)
    setError('')

    const formData = new FormData()
    formData.append('token', token)
    formData.append('docRequestId', docRequestId)
    formData.append('file', file)

    const res = await fetch('/api/client/upload', { method: 'POST', body: formData })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Upload failed. Try again.')
    } else {
      await fetchClient()
    }
    setUploading(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0f2240] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-[#c9a84c] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60 text-sm">Loading your secure document portal...</p>
      </div>
    </div>
  )

  if (error && !client) return (
    <div className="min-h-screen bg-[#0f2240] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
        </div>
        <p className="text-white font-semibold">{error}</p>
        <p className="text-white/40 text-sm mt-2">Please contact your loan officer for a new link.</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-[#0f2240] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-[#c9a84c]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-[#c9a84c]"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        </div>
        <h2 className="text-xl font-bold text-white">Documents submitted</h2>
        <p className="text-white/60 text-sm mt-2">Your loan officer has been notified and will review them shortly.</p>
      </div>
    </div>
  )

  const docs = client?.document_requests ?? []
  const categories = [...new Set(docs.map(d => d.category ?? 'Documents'))]
  const uploaded = docs.filter(d => d.status === 'uploaded' || d.status === 'approved').length
  const pct = docs.length ? Math.round((uploaded / docs.length) * 100) : 0
  const allUploaded = docs.length > 0 && docs.every(d => d.status === 'uploaded' || d.status === 'approved')

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header — branded with brokerage name */}
      {(() => {
        const broker = client?.brokers as any
        const brokerage = broker?.brokerages
        const displayName = brokerage?.name ?? 'WireChase'
        const brokerName = broker?.full_name
        const initials = displayName.slice(0, 2).toUpperCase()
        return (
          <header className="bg-[#0f2240] px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#c9a84c] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-[#0f2240] text-xs font-bold">{initials}</span>
              </div>
              <div>
                <h1 className="text-white font-bold text-sm">{displayName}</h1>
                <p className="text-white/40 text-xs">
                  {brokerName ? `Your loan officer: ${brokerName}` : 'Secure Document Portal'}
                  {brokerage?.nmls ? ` · NMLS #${brokerage.nmls}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              <span className="text-white/60 text-xs">Encrypted</span>
            </div>
          </header>
        )
      })()}

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Greeting */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Hi, {client?.full_name}</h2>
          <p className="text-gray-500 text-sm mt-1">Upload the documents below. Your loan officer will be notified when you're done.</p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">Progress</span>
            <span className="font-bold text-gray-900">{uploaded}/{docs.length} uploaded</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="bg-[#c9a84c] h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          {allUploaded && (
            <p className="text-green-600 text-sm font-medium mt-2">All documents uploaded — ready to submit</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}

        {/* Documents by category */}
        <div className="space-y-4 mb-6">
          {categories.map(cat => (
            <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat}</p>
              </div>
              <div className="divide-y divide-gray-50">
                {docs.filter(d => (d.category ?? 'Documents') === cat).map(doc => (
                  <div key={doc.id} className="p-4">
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{doc.label}</p>
                        {doc.required && <span className="text-xs text-red-400">Required</span>}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                        doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                        doc.status === 'uploaded' ? 'bg-[#fdf6e3] text-[#0f2240]' :
                        doc.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {doc.status === 'missing' ? 'Needed' :
                         doc.status === 'approved' ? 'Approved' :
                         doc.status === 'rejected' ? 'Re-upload needed' :
                         'Uploaded'}
                      </span>
                    </div>

                    {(doc.status === 'missing' || doc.status === 'rejected') ? (
                      <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl py-4 px-3 text-sm text-gray-400 cursor-pointer hover:border-[#c9a84c] hover:text-[#0f2240] hover:bg-[#fdf6e3] transition min-h-[52px] ${uploading === doc.id ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleUpload(doc.id, file)
                          }}
                        />
                        {uploading === doc.id ? 'Uploading...' : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                            Click to upload · PDF, JPG, PNG (max 10MB)
                          </>
                        )}
                      </label>
                    ) : (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        Document received by your loan officer
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit button */}
        {allUploaded && (
          <button
            onClick={() => setSubmitted(true)}
            className="w-full bg-[#0f2240] text-white rounded-2xl py-4 text-base font-bold hover:bg-[#1a3560] transition shadow-sm"
          >
            Submit All Documents
          </button>
        )}

        <p className="text-center text-xs text-gray-300 mt-6">
          Your documents are encrypted and securely stored. Only your loan officer can access them.
        </p>
      </main>
    </div>
  )
}
