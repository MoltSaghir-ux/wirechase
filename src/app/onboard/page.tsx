'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OnboardPage({ searchParams }: { searchParams: { token?: string } }) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>(searchParams.token ? 'join' : 'choose')
  const [companyName, setCompanyName] = useState('')
  const [nmls, setNmls] = useState('')
  const [joinToken, setJoinToken] = useState(searchParams.token ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserEmail(data.user.email ?? '')
      // Check if already onboarded
      supabase.from('brokers').select('brokerage_id').eq('id', data.user.id).single().then(({ data: b }) => {
        if (b?.brokerage_id) router.push('/broker/dashboard')
      })
    })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const res = await fetch('/api/onboard/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyName, nmls }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setLoading(false); return }
    router.push('/broker/dashboard')
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/onboard/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: joinToken.trim() }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setLoading(false); return }
    router.push('/broker/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <span className="text-white font-bold text-lg">WireChase</span>
        </div>
        <div>
          <h2 className="text-white text-2xl font-light leading-relaxed mb-4">
            Set up your brokerage workspace in under 2 minutes.
          </h2>
          <p className="text-white/40 text-sm">Your whole team — one platform.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-[#f8fafc]">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">W</span>
            </div>
            <span className="text-gray-900 font-bold">WireChase</span>
          </div>

          {mode === 'choose' && (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome to WireChase</h2>
              <p className="text-gray-400 text-sm mb-8">Signed in as <strong>{userEmail}</strong>. How would you like to get started?</p>
              <div className="space-y-3">
                <button onClick={() => setMode('create')}
                  className="w-full text-left bg-white border-2 border-gray-200 hover:border-blue-500 rounded-2xl p-5 transition group">
                  <p className="font-semibold text-gray-900 group-hover:text-blue-600">🏢 Create a new brokerage</p>
                  <p className="text-sm text-gray-400 mt-1">You're the owner or admin — set up your company workspace</p>
                </button>
                <button onClick={() => setMode('join')}
                  className="w-full text-left bg-white border-2 border-gray-200 hover:border-blue-500 rounded-2xl p-5 transition group">
                  <p className="font-semibold text-gray-900 group-hover:text-blue-600">🤝 Join an existing brokerage</p>
                  <p className="text-sm text-gray-400 mt-1">Your admin sent you an invite link or code</p>
                </button>
              </div>
            </>
          )}

          {mode === 'create' && (
            <>
              <button onClick={() => setMode('choose')} className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your brokerage</h2>
              <p className="text-gray-400 text-sm mb-6">You'll be the admin. You can invite team members after setup.</p>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required maxLength={100}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ABC Mortgage LLC" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Company NMLS # <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="text" value={nmls} onChange={e => setNmls(e.target.value)} maxLength={20}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456" />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm">
                  {loading ? 'Setting up...' : 'Create Brokerage & Continue'}
                </button>
              </form>
            </>
          )}

          {mode === 'join' && (
            <>
              <button onClick={() => setMode('choose')} className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
                ← Back
              </button>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Join a brokerage</h2>
              <p className="text-gray-400 text-sm mb-6">Paste the invite link or code your admin sent you.</p>
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Invite Code or Link</label>
                  <input type="text" value={joinToken} onChange={e => setJoinToken(e.target.value.split('/').pop() ?? e.target.value)} required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Paste invite link or code" />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm">
                  {loading ? 'Joining...' : 'Join Brokerage'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
