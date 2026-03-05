'use client'

import { useState } from 'react'

type Code = {
  id: string
  code: string
  used_by: string | null
  used_at: string | null
  created_at: string
}

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 60 * 1000 // 60 seconds

export default function AdminCodesPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [codes, setCodes] = useState<Code[]>([])
  const [generating, setGenerating] = useState(false)
  const [count, setCount] = useState(1)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  // Rate limiting state
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)

  async function loadCodes(pw: string) {
    const res = await fetch('/api/admin/codes', {
      headers: { 'Authorization': `Bearer ${pw}` },
    })
    if (res.ok) {
      const data = await res.json()
      setCodes(data.codes)
      return true
    }
    return false
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Check lockout
    if (lockedUntil && Date.now() < lockedUntil) {
      const secsLeft = Math.ceil((lockedUntil - Date.now()) / 1000)
      setError(`Too many attempts — try again in ${secsLeft}s`)
      return
    }

    const ok = await loadCodes(password)
    if (ok) {
      setAuthed(true)
      setAttempts(0)
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS)
        setError('Too many attempts — try again later')
      } else {
        setError(`Wrong password (${newAttempts}/${MAX_ATTEMPTS} attempts)`)
      }
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${password}`,
      },
      body: JSON.stringify({ secret: password, count }),
    })
    if (res.ok) {
      await loadCodes(password)
    }
    setGenerating(false)
  }

  async function handleRevoke(codeId: string) {
    if (!confirm('Revoke this code? This cannot be undone.')) return
    setRevoking(codeId)
    await fetch('/api/admin/codes', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${password}`,
      },
      body: JSON.stringify({ secret: password, codeId }),
    })
    await loadCodes(password)
    setRevoking(null)
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const available = codes.filter(c => !c.used_by).length
  const used = codes.filter(c => c.used_by).length
  const isLocked = lockedUntil !== null && Date.now() < lockedUntil

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 w-full max-w-sm">
          <div className="w-10 h-10 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center mb-5">
            <svg className="w-5 h-5 text-[#c9a84c]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-white font-bold text-xl mb-1">Admin Access</h1>
          <p className="text-slate-400 text-sm mb-6">Enter your admin password to manage invite codes.</p>
          {error && <p className="text-red-400 text-sm mb-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Admin password"
              disabled={isLocked}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c9a84c] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLocked}
              className="w-full bg-[#c9a84c] hover:bg-[#a8893a] text-[#0f2240] font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50"
            >
              {isLocked ? 'Locked — try again later' : 'Enter'}
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
              {[1, 5, 10, 25].map(n => <option key={n} value={n}>Generate {n}</option>)}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-[#c9a84c] hover:bg-[#a8893a] text-[#0f2240] font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-60"
            >
              {generating ? 'Generating…' : '+ Generate'}
            </button>
          </div>
        </div>

        {/* Summary */}
        {codes.length > 0 && (
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-green-400 font-semibold">{available} available</span>
            <span className="text-slate-600">·</span>
            <span className="text-sm text-slate-400">{used} used</span>
          </div>
        )}

        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr className="text-slate-400 text-xs uppercase tracking-wide">
                <th className="text-left px-6 py-3">Code</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Used At</th>
                <th className="text-left px-6 py-3">Created</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-slate-500 py-10">No codes yet. Generate some above.</td>
                </tr>
              )}
              {codes.map(c => (
                <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="px-6 py-3 font-mono text-white tracking-widest">
                    <div className="flex items-center gap-2">
                      {c.code}
                      <button
                        onClick={() => copyCode(c.code, c.id)}
                        title="Copy code"
                        className="text-slate-500 hover:text-[#c9a84c] transition ml-1"
                      >
                        {copiedId === c.id ? (
                          <span className="text-[10px] text-green-400 font-bold">Copied!</span>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
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
                  <td className="px-6 py-3 text-right">
                    {!c.used_by && (
                      <button
                        onClick={() => handleRevoke(c.id)}
                        disabled={revoking === c.id}
                        className="text-xs text-red-400/60 hover:text-red-400 transition disabled:opacity-40"
                      >
                        {revoking === c.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    )}
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
