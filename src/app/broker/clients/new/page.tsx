'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { MORTGAGE_PROGRAMS, DocItem } from '@/lib/mortgage-programs'

interface DocRow extends DocItem {
  enabled: boolean
}

export default function NewClientPage() {
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [docs, setDocs] = useState<DocRow[]>([])
  const [customDoc, setCustomDoc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Load user email on mount
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
    })
  })

  function selectProgram(programId: string) {
    setSelectedProgram(programId)
    const program = MORTGAGE_PROGRAMS.find(p => p.id === programId)
    if (program) {
      setDocs(program.docs.map(d => ({ ...d, enabled: true })))
    }
  }

  function toggleDoc(index: number) {
    setDocs(docs.map((d, i) => i === index ? { ...d, enabled: !d.enabled } : d))
  }

  function addCustomDoc() {
    if (customDoc.trim()) {
      setDocs([...docs, { label: customDoc.trim(), required: false, category: 'Custom', enabled: true }])
      setCustomDoc('')
    }
  }

  function removeDoc(index: number) {
    setDocs(docs.filter((_, i) => i !== index))
  }

  const categories = [...new Set(docs.map(d => d.category))]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const safeName = fullName.trim().slice(0, 100)
    const safeEmail = email.trim().toLowerCase().slice(0, 200)

    // Upsert broker record
    await supabase.from('brokers').upsert({
      id: user.id,
      full_name: user.email ?? 'Broker',
      email: user.email ?? '',
    }, { onConflict: 'id' })

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

    const activeDocs = docs.filter(d => d.enabled)
    if (activeDocs.length > 0) {
      await supabase.from('document_requests').insert(
        activeDocs.map(d => ({
          client_id: client.id,
          label: d.label.slice(0, 200),
          required: d.required,
        }))
      )
    }

    const link = `${window.location.origin}/client/upload/${client.invite_token}`
    setInviteLink(link)
    setLoading(false)
  }

  if (inviteLink) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Nav email={userEmail} />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-md p-8 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Client Added!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Send this link to <strong>{fullName}</strong> to upload their documents.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-xs text-gray-700 break-all mb-4">
              {inviteLink}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
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
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Nav email={userEmail} />

      <main className="flex-1 px-8 py-8 max-w-3xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Add New Client</h2>
        <p className="text-gray-500 text-sm mb-6">Select a mortgage program to auto-fill the document checklist.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Client Info</h3>
            <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Program Selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Mortgage Program</h3>
            <div className="grid grid-cols-2 gap-2">
              {MORTGAGE_PROGRAMS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProgram(p.id)}
                  className={`text-left px-4 py-3 rounded-lg border text-sm transition ${
                    selectedProgram === p.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Document Checklist */}
          {docs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Document Checklist</h3>
                <span className="text-xs text-gray-400">{docs.filter(d => d.enabled).length} selected</span>
              </div>

              <div className="space-y-5">
                {categories.map(cat => (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat}</p>
                    <div className="space-y-1.5">
                      {docs.map((doc, i) => doc.category === cat && (
                        <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition ${doc.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                          <input
                            type="checkbox"
                            checked={doc.enabled}
                            onChange={() => toggleDoc(i)}
                            className="accent-blue-600"
                          />
                          <span className="flex-1 text-sm text-gray-700">{doc.label}</span>
                          {doc.required && <span className="text-xs text-red-400">Required</span>}
                          <button type="button" onClick={() => removeDoc(i)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add custom doc */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <input
                  type="text"
                  value={customDoc}
                  onChange={e => setCustomDoc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomDoc())}
                  maxLength={200}
                  placeholder="Add a custom document..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={addCustomDoc} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 transition">
                  Add
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !selectedProgram}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition"
          >
            {loading ? 'Creating...' : 'Create Client & Generate Invite Link'}
          </button>
        </form>
      </main>
    </div>
  )
}
