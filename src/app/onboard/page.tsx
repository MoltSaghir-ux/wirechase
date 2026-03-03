'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Tab = 'create' | 'join'

export default function OnboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<Tab>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')

  // Create brokerage form
  const [brokerageName, setBrokerageName] = useState('')
  const [brokerageNmls, setBrokerageNmls] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [yourName, setYourName] = useState('')

  // Join brokerage form
  const [joinToken, setJoinToken] = useState('')
  const [joinName, setJoinName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserEmail(data.user.email ?? '')
      setUserId(data.user.id)
      // If already onboarded, go to dashboard
      supabase
        .from('brokers')
        .select('brokerage_id')
        .eq('id', data.user.id)
        .single()
        .then(({ data: broker }) => {
          if (broker?.brokerage_id) router.push('/broker/dashboard')
        })
    })
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/onboard/create-brokerage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: userEmail,
          fullName: yourName.trim(),
          brokerageName: brokerageName.trim(),
          brokerageNmls: brokerageNmls.trim(),
          inviteCode: inviteCode.trim().toUpperCase(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Something went wrong')
      router.push('/broker/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/onboard/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: joinToken.trim(),
          userId,
          email: userEmail,
          fullName: joinName.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Invalid invite token')
      router.push('/broker/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">WireChase</span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">Set up your workspace</h1>
          <p className="text-slate-400 text-sm mt-1">You're almost in. Choose how to get started.</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              tab === 'create'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create a Brokerage
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              tab === 'join'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Join a Brokerage
          </button>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Your Full Name</label>
                <input
                  value={yourName}
                  onChange={e => setYourName(e.target.value)}
                  required
                  placeholder="Jane Smith"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Brokerage Name</label>
                <input
                  value={brokerageName}
                  onChange={e => setBrokerageName(e.target.value)}
                  required
                  placeholder="Smith Lending Group"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Brokerage NMLS # <span className="text-slate-500">(optional)</span></label>
                <input
                  value={brokerageNmls}
                  onChange={e => setBrokerageNmls(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Platform Invite Code</label>
                <input
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  required
                  placeholder="WIRE-XXXX"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest uppercase"
                />
                <p className="text-xs text-slate-500 mt-1.5">Need a code? Contact WireChase to get access.</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-2"
              >
                {loading ? 'Setting up…' : 'Create Brokerage →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Your Full Name</label>
                <input
                  value={joinName}
                  onChange={e => setJoinName(e.target.value)}
                  required
                  placeholder="Jane Smith"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Team Invite Token</label>
                <input
                  value={joinToken}
                  onChange={e => setJoinToken(e.target.value)}
                  required
                  placeholder="Paste your invite token here"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-slate-500 mt-1.5">Get this token from your brokerage admin.</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors mt-2"
              >
                {loading ? 'Joining…' : 'Join Brokerage →'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Signed in as {userEmail} ·{' '}
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="underline hover:text-slate-300">
            Sign out
          </button>
        </p>
      </div>
    </div>
  )
}
