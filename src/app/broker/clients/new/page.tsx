'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { MORTGAGE_PROGRAMS, DocItem } from '@/lib/mortgage-programs'

interface DocRow extends DocItem {
  enabled: boolean
}

export default function NewClientPage() {
  const [userEmail, setUserEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [docs, setDocs] = useState<DocRow[]>([])
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [clientName, setClientName] = useState('')
  const [templates, setTemplates] = useState<{id:string; name:string; docs:DocItem[]}[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
    })
    // Load saved templates
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: t } = await supabase.from('doc_templates').select('id, name, docs').eq('broker_id', data.user.id)
      if (t) setTemplates(t)
    })
  }, [])

  function selectProgram(programId: string) {
    setSelectedProgram(programId)
    const program = MORTGAGE_PROGRAMS.find(p => p.id === programId)
    if (program) setDocs(program.docs.map(d => ({ ...d, enabled: true })))
  }

  function loadTemplate(template: {id:string; name:string; docs:DocItem[]}) {
    setSelectedProgram('template:' + template.id)
    setDocs(template.docs.map(d => ({ ...d, enabled: true })))
  }

  function toggleDoc(index: number) {
    setDocs(docs.map((d, i) => i === index ? { ...d, enabled: !d.enabled } : d))
  }

  function removeDoc(index: number) {
    setDocs(docs.filter((_, i) => i !== index))
  }

  // All presets not already in the list
  const allPresets = MORTGAGE_PROGRAMS.flatMap(p =>
    p.docs.map(d => ({ label: d.label, category: d.category, program: p.name }))
  ).filter((p, i, arr) => arr.findIndex(x => x.label === p.label) === i)

  const existingLabels = new Set(docs.map(d => d.label))
  const filteredPresets = allPresets
    .filter(p => !existingLabels.has(p.label))
    .filter(p => !search || p.label.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))

  function addFromPreset(label: string, category: string) {
    setDocs(prev => [...prev, { label, category, required: false, enabled: true }])
    setSearch('')
    setShowDropdown(false)
  }

  function addCustomDoc() {
    if (!search.trim()) return
    setDocs(prev => [...prev, { label: search.trim().slice(0, 200), category: 'Custom', required: false, enabled: true }])
    setSearch('')
    setShowDropdown(false)
  }

  const categories = [...new Set(docs.map(d => d.category))]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    await supabase.from('brokers').upsert({ id: user.id, full_name: user.email ?? 'Broker', email: user.email ?? '' }, { onConflict: 'id' })

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({ broker_id: user.id, full_name: fullName.trim().slice(0, 100), email: email.trim().toLowerCase().slice(0, 200) })
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
        activeDocs.map(d => ({ client_id: client.id, label: d.label.slice(0, 200), required: d.required, category: d.category }))
      )
    }

    await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id }),
    })

    setClientName(fullName)
    setInviteLink(`${window.location.origin}/client/upload/${client.invite_token}`)
    setLoading(false)
  }

  if (inviteLink) {
    return (
      <div className="flex min-h-screen bg-[#f8fafc]">
        <Nav email={userEmail} />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-md p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Client Added!</h2>
            <p className="text-gray-400 text-sm mb-6">Invite email sent to <strong className="text-gray-700">{clientName}</strong>. You can also copy the link below.</p>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-xs text-gray-500 break-all mb-4 text-left">{inviteLink}</div>
            <button
              onClick={() => navigator.clipboard.writeText(inviteLink)}
              className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 transition mb-3"
            >
              Copy Link
            </button>
            <button
              onClick={() => router.push('/broker/dashboard')}
              className="w-full border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={userEmail} />

      <main className="flex-1 px-8 py-8 max-w-3xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Add New Client</h2>
        <p className="text-gray-400 text-sm mb-7">Select a mortgage program then customize the document checklist.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Client Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide text-gray-400">Client Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={100}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={200}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="jane@example.com" />
              </div>
            </div>
          </div>

          {/* Program Selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide text-gray-400">Mortgage Program</h3>
            {templates.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your Templates</p>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map(t => (
                    <button key={t.id} type="button" onClick={() => loadTemplate(t)}
                      className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                        selectedProgram === 'template:' + t.id ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}>
                      <p className="font-semibold">⭐ {t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.docs.length} documents</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Standard Programs</p>
            <div className="grid grid-cols-2 gap-2">
              {MORTGAGE_PROGRAMS.map(p => (
                <button key={p.id} type="button" onClick={() => selectProgram(p.id)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                    selectedProgram === p.id ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Document Checklist */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">Document Checklist</h3>
                <p className="text-xs text-gray-400 mt-0.5">{docs.filter(d => d.enabled).length} documents selected</p>
              </div>

              {/* Add doc dropdown */}
              <div className="relative">
                <button type="button" onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                  Add Document
                </button>
                {showDropdown && (
                  <div className="absolute right-0 top-9 z-50 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                      <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search or type custom doc..."
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredPresets.map((p, i) => (
                        <button key={i} type="button" onClick={() => addFromPreset(p.label, p.category)}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 transition">
                          <p className="text-gray-800">{p.label}</p>
                          <p className="text-xs text-gray-400">{p.category} · {p.program}</p>
                        </button>
                      ))}
                      {search.trim() && !filteredPresets.find(p => p.label.toLowerCase() === search.toLowerCase()) && (
                        <button type="button" onClick={addCustomDoc}
                          className="w-full text-left px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100">
                          + Add "{search.trim()}" as custom document
                        </button>
                      )}
                      {filteredPresets.length === 0 && !search && (
                        <p className="px-4 py-3 text-sm text-gray-400">All standard docs already added.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {docs.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                <p className="text-sm text-gray-400">Select a mortgage program above to populate the checklist,</p>
                <p className="text-sm text-gray-400">or use the Add Document button to build manually.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {categories.map(cat => (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{cat}</p>
                    <div className="space-y-1.5">
                      {docs.map((doc, i) => doc.category === cat && (
                        <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition ${doc.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                          <input type="checkbox" checked={doc.enabled} onChange={() => toggleDoc(i)} className="accent-blue-600 flex-shrink-0" />
                          <span className="flex-1 text-sm text-gray-700">{doc.label}</span>
                          {doc.required && <span className="text-xs text-red-400 flex-shrink-0">Required</span>}
                          <button type="button" onClick={() => removeDoc(i)} className="text-gray-300 hover:text-red-400 transition flex-shrink-0">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition shadow-sm">
            {loading ? 'Creating & Sending...' : 'Create Client & Send Invite'}
          </button>
        </form>
      </main>
    </div>
  )
}
