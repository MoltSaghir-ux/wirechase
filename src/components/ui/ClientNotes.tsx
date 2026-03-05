'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Note {
  id: string
  content: string
  created_at: string
}

export default function ClientNotes({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function loadNotes() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('client_notes')
      .select('id, content, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    setNotes(data ?? [])
  }

  useEffect(() => { loadNotes() }, [clientId])

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('client_notes').insert({
      client_id: clientId,
      broker_id: user.id,
      content: text.trim().slice(0, 1000),
    })
    setText('')
    await loadNotes()
    setSaving(false)
  }

  async function deleteNote(id: string) {
    await supabase.from('client_notes').delete().eq('id', id)
    setNotes(notes.filter(n => n.id !== id))
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Internal Notes</h3>
        <p className="text-xs text-gray-400 mt-0.5">Only visible to you — not shared with client</p>
      </div>

      <div className="p-6">
        <form onSubmit={addNote} className="flex gap-2 mb-5">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={1000}
            placeholder="Add a note... (e.g. Called 3x, no response)"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:bg-white"
          />
          <button type="submit" disabled={saving || !text.trim()}
            className="bg-[#0f2240] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1a3560] disabled:opacity-40 transition">
            {saving ? '...' : 'Add'}
          </button>
        </form>

        {notes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No notes yet</p>
        ) : (
          <div className="space-y-3">
            {notes.map(note => (
              <div key={note.id} className="flex items-start gap-3 group">
                <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                  <p className="text-sm text-gray-800">{note.content}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => deleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-red-400 mt-2 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
