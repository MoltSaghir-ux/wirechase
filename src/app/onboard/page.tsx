'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'

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
      router.push('/broker/welcome')
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

  const valueProps = [
    {
      text: 'Full pipeline management — from application to funded',
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
      ),
    },
    {
      text: 'Automated borrower updates and document collection',
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      text: 'AI-powered processing coming soon',
      icon: (
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-[#0f2240] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        {/* Left: Branding */}
        <div className="text-white space-y-8 px-4 lg:px-8">
          <Logo size="lg" />

          <div>
            <h1 className="text-4xl font-black leading-tight mb-4">The modern mortgage broker platform</h1>
            <p className="text-white/70 text-lg">Manage your pipeline, automate communication, and close more loans.</p>
          </div>

          <div className="space-y-4">
            {valueProps.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Form card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Set up your workspace</h2>
          <p className="text-gray-400 text-sm mb-6">You&apos;re almost in. Choose how to get started.</p>

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setTab('create')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                tab === 'create'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Create Brokerage
            </button>
            <button
              onClick={() => setTab('join')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                tab === 'join'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Join a Team
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Full Name</label>
                <input
                  value={yourName}
                  onChange={e => setYourName(e.target.value)}
                  required
                  placeholder="Jane Smith"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Brokerage Name</label>
                <input
                  value={brokerageName}
                  onChange={e => setBrokerageName(e.target.value)}
                  required
                  placeholder="Smith Lending Group"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Brokerage NMLS # <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  value={brokerageNmls}
                  onChange={e => setBrokerageNmls(e.target.value)}
                  placeholder="123456"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform Invite Code</label>
                <input
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  required
                  placeholder="WIRE-XXXX"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm placeholder:text-gray-400 font-mono tracking-widest uppercase"
                />
                <p className="text-xs text-gray-400 mt-1.5">Need a code? Contact WireChase to get access.</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0f2240] hover:bg-[#1a3560] disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors mt-2 shadow-sm"
              >
                {loading ? 'Setting up…' : 'Create Brokerage →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Full Name</label>
                <input
                  value={joinName}
                  onChange={e => setJoinName(e.target.value)}
                  required
                  placeholder="Jane Smith"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Team Invite Token</label>
                <input
                  value={joinToken}
                  onChange={e => setJoinToken(e.target.value)}
                  required
                  placeholder="Paste your invite token here"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm placeholder:text-gray-400 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1.5">Get this token from your brokerage admin.</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0f2240] hover:bg-[#1a3560] disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors mt-2 shadow-sm"
              >
                {loading ? 'Joining…' : 'Join Brokerage →'}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Signed in as {userEmail} ·{' '}
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              className="underline hover:text-gray-600"
            >
              Sign out
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}
