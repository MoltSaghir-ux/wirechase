'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { use } from 'react'

interface DocRequest {
  id: string
  label: string
  status: string
  required: boolean
}

interface ClientData {
  id: string
  full_name: string
  document_requests: DocRequest[]
}

export default function ClientUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [client, setClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const supabase = createClient()

  const fetchClient = useCallback(async () => {
    // Validate token format (UUID-like)
    if (!/^[a-zA-Z0-9\-]{10,100}$/.test(token)) {
      setError('Invalid link.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, document_requests (id, label, status, required)')
      .eq('invite_token', token)
      .single()

    if (error || !data) {
      setError('This link is invalid or has expired.')
    } else {
      setClient(data)
    }
    setLoading(false)
  }, [token, supabase])

  useEffect(() => { fetchClient() }, [fetchClient])

  async function handleUpload(docRequestId: string, file: File) {
    // Validate file type (images + PDFs only)
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Only PDF, JPG, PNG, or WEBP files allowed.')
      return
    }

    // 10MB max
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.')
      return
    }

    setUploading(docRequestId)
    setError('')

    // Sanitize filename
    const ext = file.name.split('.').pop()?.toLowerCase()
    const safeName = `${client!.id}/${docRequestId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(safeName, file, { upsert: false })

    if (uploadError) {
      setError('Upload failed. Try again.')
      setUploading(null)
      return
    }

    // Save document record
    await supabase.from('documents').insert({
      document_request_id: docRequestId,
      file_name: file.name.slice(0, 200),
      file_path: safeName,
      file_size: file.size,
    })

    // Update status
    await supabase
      .from('document_requests')
      .update({ status: 'uploaded' })
      .eq('id', docRequestId)

    setUploading(null)
    fetchClient()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )

  if (error && !client) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-500 font-medium">{error}</p>
        <p className="text-gray-400 text-sm mt-2">Please contact your broker for a new link.</p>
      </div>
    </div>
  )

  const docs = client?.document_requests ?? []
  const uploaded = docs.filter(d => d.status !== 'missing').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">WireChase</h1>
        <p className="text-sm text-gray-500">Document Upload Portal</p>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Hi, {client?.full_name}</h2>
          <p className="text-gray-500 text-sm mt-1">
            Please upload the documents below. Your broker will be notified automatically.
          </p>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium text-gray-900">{uploaded}/{docs.length} uploaded</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: docs.length ? `${(uploaded / docs.length) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* Document list */}
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{doc.label}</p>
                  {doc.required && <span className="text-xs text-red-500">Required</span>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  doc.status === 'uploaded' || doc.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {doc.status === 'missing' ? 'Needed' : doc.status}
                </span>
              </div>

              {doc.status === 'missing' && (
                <label className={`block w-full border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition ${uploading === doc.id ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleUpload(doc.id, file)
                    }}
                  />
                  <p className="text-sm text-gray-500">
                    {uploading === doc.id ? 'Uploading...' : 'Click to upload · PDF, JPG, PNG (max 10MB)'}
                  </p>
                </label>
              )}

              {doc.status !== 'missing' && (
                <p className="text-xs text-green-600">✓ Document received</p>
              )}
            </div>
          ))}
        </div>

        {uploaded === docs.length && docs.length > 0 && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-green-700 font-medium">All documents submitted!</p>
            <p className="text-green-600 text-sm mt-1">Your broker has been notified. You're all set.</p>
          </div>
        )}
      </main>
    </div>
  )
}
