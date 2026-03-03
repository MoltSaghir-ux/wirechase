'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/ui/Nav'
import { MORTGAGE_PROGRAMS } from '@/lib/mortgage-programs'

interface Template {
  id: string
  name: string
  program: string | null
  docs: { label: string; category: string; required: boolean }[]
  created_at: string
}

export default function TemplatesPage() {
  const [userEmail, setUserEmail] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserEmail(user.email ?? '')
    const { data } = await supabase.from('doc_templates').select('*').eq('broker_id', user.id).order('created_at', { ascending: false })
    setTemplates(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !selectedProgram) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const program = MORTGAGE_PROGRAMS.find(p => p.id === selectedProgram)
    const docs = program?.docs ?? []

    await supabase.from('doc_templates').insert({
      broker_id: user.id,
      name: name.trim().slice(0, 100),
      program: selectedProgram,
      docs,
    })

    setName('')
    setSelectedProgram('')
    setShowNew(false)
    await load()
    setSaving(false)
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return
    await supabase.from('doc_templates').delete().eq('id', id)
    setTemplates(templates.filter(t => t.id !== id))
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={userEmail} />
      <main className="flex-1 px-8 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Document Templates</h2>
            <p className="text-gray-400 text-sm mt-0.5">Save checklist presets for quick client setup</p>
          </div>
          <button onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
            + New Template
          </button>
        </div>

        {/* New template form */}
        {showNew && (
          <form onSubmit={saveTemplate} className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 mb-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Create Template</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Template Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required maxLength={100}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                placeholder='e.g. "My Standard FHA" or "Self-Employed Conventional"' />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Based on Program</label>
              <div className="grid grid-cols-2 gap-2">
                {MORTGAGE_PROGRAMS.map(p => (
                  <button key={p.id} type="button" onClick={() => setSelectedProgram(p.id)}
                    className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                      selectedProgram === p.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.docs.length} docs</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving || !name.trim() || !selectedProgram}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition">
                {saving ? 'Saving...' : 'Save Template'}
              </button>
              <button type="button" onClick={() => setShowNew(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </form>
        )}

        {/* Template list */}
        {templates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <p className="text-gray-400 text-sm">No templates yet</p>
            <p className="text-gray-300 text-xs mt-1">Create one to speed up client setup</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.program ? MORTGAGE_PROGRAMS.find(p => p.id === t.program)?.name : 'Custom'} · {t.docs.length} documents
                  </p>
                </div>
                <button onClick={() => deleteTemplate(t.id)} className="text-gray-300 hover:text-red-400 transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
