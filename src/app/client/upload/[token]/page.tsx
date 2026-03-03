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
      .select('id, full_name, status, document_requests (id, label, status, required, category)')
      .eq('invite_token', token)
      .single()

    if (error || !data) {
      setError('This link is invalid or has expired.')
    } else {
      setClient(data)
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

  async function addPresetDoc(label: string, category: string) {
    if (!client) return
    // Check if already exists
    if (client.document_requests.some(d => d.label === label)) return

    const { error } = await supabase.from('document_requests').insert({
      client_id: client.id,
      label,
      category,
      required: false,
    })
    if (!error) {
      setShowPresets(false)
      await fetchClient()
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )

  if (error && !client) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-gray-800 font-semibold">{error}</p>
        <p className="text-gray-400 text-sm mt-2">Please contact your broker for a new link.</p>
      </div>
    </div>
  )

  if (submitted) return (
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

  const docs = client?.document_requests ?? []
  const categories = [...new Set(docs.map(d => d.category ?? 'Documents'))]
  const uploaded = docs.filter(d => d.status !== 'missing').length
  const pct = docs.length ? Math.round((uploaded / docs.length) * 100) : 0
  const allUploaded = docs.length > 0 && uploaded === docs.length

  // All presets across all programs, deduped
  const allPresets = MORTGAGE_PROGRAMS.flatMap(p =>
    p.docs.map(d => ({ label: d.label, category: d.category, program: p.name }))
  ).filter((p, i, arr) => arr.findIndex(x => x.label === p.label) === i)

  const existingLabels = new Set(docs.map(d => d.label))
  const availablePresets = allPresets.filter(p => !existingLabels.has(p.label))

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-[#0f172a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">WireChase</h1>
            <p className="text-white/40 text-xs">Secure Document Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          <span className="text-white/60 text-xs">Encrypted</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        {/* Greeting */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Hi, {client?.full_name} 👋</h2>
          <p className="text-gray-500 text-sm mt-1">Upload the documents below. Your loan officer will be notified when you're done.</p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">Progress</span>
            <span className="font-bold text-gray-900">{uploaded}/{docs.length} uploaded</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          {allUploaded && (
            <p className="text-green-600 text-sm font-medium mt-2">✓ All documents uploaded — ready to submit!</p>
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
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{doc.label}</p>
                        {doc.required && <span className="text-xs text-red-400">Required</span>}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        doc.status !== 'missing' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {doc.status === 'missing' ? 'Needed' : '✓ Uploaded'}
                      </span>
                    </div>

                    {doc.status === 'missing' ? (
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
                    ) : (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <span>✓</span> Document received by your loan officer
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
