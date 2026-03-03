'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const DEFAULT_DOCS = [
  'Government-Issued ID',
  'W-2 (Last 2 Years)',
  'Recent Pay Stubs (Last 30 Days)',
  'Federal Tax Returns (Last 2 Years)',
  'Bank Statements (Last 2 Months)',
  'Proof of Assets',
]

export default function NewClientPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [docs, setDocs] = useState<string[]>(DEFAULT_DOCS)
  const [customDoc, setCustomDoc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function addCustomDoc() {
    if (customDoc.trim()) {
      setDocs([...docs, customDoc.trim()])
      setCustomDoc('')
    }
  }

  function removeDoc(index: number) {
    setDocs(docs.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Sanitize inputs
    const safeName = fullName.trim().slice(0, 100)
    const safeEmail = email.trim().toLowerCase().slice(0, 200)

    // Create client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({ broker_id: user.id, full_name: safeName, email: safeEmail })
      .select()
      .single()

    if (clientError || !client) {
      setError('Failed to create client. Try again.')
      setLoading(false)
      return
    }

    // Create document requests
    const docRequests = docs.map(label => ({
      client_id: client.id,
      label: label.trim().slice(0, 200),
    }))

    const { error: docsError } = await supabase
      .from('document_requests')
      .insert(docRequests)

    if (docsError) {
      setError('Client created but failed to add documents.')
      setLoading(false)
      return
    }

    const link = `${window.location.origin}/client/upload/${client.invite_token}`
    setInviteLink(link)
    setLoading(false)
  }

  if (inviteLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-md p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Client Added!</h2>
          <p className="text-gray-500 text-sm mb-6">Send this link to <strong>{fullName}</strong> to upload their documents.</p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-xs text-gray-700 break-all mb-4">
            {inviteLink}
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(inviteLink) }}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition mb-3"
          >
            Copy Link
          </button>
          <button
            onClick={() => router.push('/broker/dashboard')}
            className="w-full border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">WireChase</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Client</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-700">Client Info</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                maxLength={100}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                maxLength={200}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="jane@example.com"
              />
            </div>
          </div>

          {/* Document checklist */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Document Checklist</h3>
            <div className="space-y-2 mb-4">
              {docs.map((doc, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700">{doc}</span>
                  <button
                    type="button"
                    onClick={() => removeDoc(i)}
                    className="text-gray-400 hover:text-red-500 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customDoc}
                onChange={e => setCustomDoc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomDoc())}
                maxLength={200}
                placeholder="Add custom document..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addCustomDoc}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 transition"
              >
                Add
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Creating...' : 'Create Client & Generate Link'}
          </button>
        </form>
      </main>
    </div>
  )
}
