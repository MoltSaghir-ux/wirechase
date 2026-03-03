'use client'

import { useState, useEffect } from 'react'

type Code = {
  id: string
  code: string
  used_by: string | null
  used_at: string | null
  created_at: string
}

export default function AdminCodesPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [codes, setCodes] = useState<Code[]>([])
  const [generating, setGenerating] = useState(false)
  const [count, setCount] = useState(1)
  const [error, setError] = useState('')

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_CODE_PASSWORD ?? 'wirechase-admin'

  async function loadCodes() {
    const res = await fetch(`/api/admin/codes?secret=${encodeURIComponent(password)}`)
    if (res.ok) {
      const data = await res.json()
      setCodes(data.codes)
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const res = fetch(`/api/admin/codes?secret=${encodeURIComponent(password)}`)
      .then(r => {
        if (r.ok) { setAuthed(true); r.json().then(d => setCodes(d.codes)) }
        else setError('Wrong password')
      })
  }

  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: password, count }),
    })
    if (res.ok) {
      await loadCodes()
    }
    setGenerating(false)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 w-full max-w-sm">
          <h1 className="text-white font-bold text-xl mb-6">Admin Access</h1>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Platform Invite Codes</h1>
            <p className="text-slate-400 text-sm mt-1">Generate codes to give vetted brokers access to create a brokerage.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none"
            >
              {[1,5,10,25].map(n => <option key={n} value={n}>Generate {n}</option>)}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              {generating ? 'Generating…' : '+ Generate'}
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr className="text-slate-400 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-3">Code</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Used At</th>
                <th className="text-left px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-slate-500 py-10">No codes yet. Generate some above.</td>
                </tr>
              )}
              {codes.map(c => (
                <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="px-6 py-3 font-mono text-white tracking-widest">{c.code}</td>
                  <td className="px-6 py-3">
                    {c.used_by
                      ? <span className="text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded-full">Used</span>
                      : <span className="text-xs bg-green-500/10 text-green-400 px-2 py-1 rounded-full">Available</span>
                    }
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    {c.used_at ? new Date(c.used_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-3 text-slate-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
