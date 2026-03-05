'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Member { id: string; full_name: string; email: string; role: string }
interface Invite { id: string; email: string; role: string; created_at: string }

export default function TeamManager({ brokerageId, currentUserId, members, invites }: {
  brokerageId: string
  currentUserId: string
  members: Member[]
  invites: Invite[]
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('loan_officer')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const router = useRouter()

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError('')
    setInviteLink('')

    const res = await fetch('/api/broker/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), role, brokerageId }),
    })
    const json = await res.json()
    setSending(false)

    if (!res.ok) { setError(json.error); return }
    setInviteLink(json.inviteLink)
    setEmail('')
    router.refresh()
  }

  async function removeMember(memberId: string) {
    if (!confirm('Remove this team member? They will lose access.')) return
    await fetch('/api/broker/team/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* Team members */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Team Members</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{members.length} members</span>
        </div>
        <div className="divide-y divide-gray-50">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {m.full_name?.slice(0, 2).toUpperCase() ?? m.email.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.full_name || m.email}</p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  m.role === 'admin' ? 'bg-blue-100 text-[#0f2240]' : 'bg-gray-100 text-gray-500'
                }`}>
                  {m.role === 'admin' ? 'Admin' : 'Loan Officer'}
                </span>
                {m.id !== currentUserId && (
                  <button onClick={() => removeMember(m.id)} className="text-gray-300 hover:text-red-400 transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Invite Team Member</h3>
        <form onSubmit={sendInvite} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="colleague@example.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:bg-white" />
            </div>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]">
              <option value="loan_officer">Loan Officer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>}

          {inviteLink && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs text-green-700 font-medium mb-2">✓ Invite created — share this link:</p>
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-white border border-green-200 rounded-lg px-3 py-2 text-gray-600 truncate">{inviteLink}</code>
                <button type="button" onClick={() => navigator.clipboard.writeText(inviteLink)}
                  className="text-xs bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition whitespace-nowrap">
                  Copy
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={sending}
            className="w-full bg-[#0f2240] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#1a3560] disabled:opacity-50 transition">
            {sending ? 'Creating invite...' : 'Send Invite'}
          </button>
        </form>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Pending Invites</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-6 py-3.5">
                <div>
                  <p className="text-sm text-gray-800">{inv.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {inv.role === 'admin' ? 'Admin' : 'Loan Officer'} · Sent {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-medium">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
