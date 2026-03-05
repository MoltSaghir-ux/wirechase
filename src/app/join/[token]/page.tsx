'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'loading' | 'signup' | 'join' | 'error'>('loading')
  const [inviteInfo, setInviteInfo] = useState<{ brokerageName: string; role: string; email: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    // Look up invite info
    fetch(`/api/onboard/invite-info?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErrorMsg(data.error); setStep('error'); return }
        setInviteInfo(data)
        setEmail(data.email ?? '')
        // Check if already logged in
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) setStep('join')
          else setStep('signup')
        })
      })
  }, [token])

  async function handleSignupAndJoin(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setLoading(true)
    try {
      // 1. Sign up
      const { error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) throw new Error(signUpErr.message)

      // 2. Sign in
      const { data: { user }, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr || !user) throw new Error('Account created — check your email to confirm, then come back to this link.')

      // 3. Join brokerage
      await joinBrokerage(user.id, user.email!, fullName)
    } catch (err: any) {
      setFormError(err.message)
      setLoading(false)
    }
  }

  async function handleJoinExisting(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setFormError('Not logged in'); setLoading(false); return }
    await joinBrokerage(user.id, user.email!, fullName)
  }

  async function joinBrokerage(userId: string, userEmail: string, name: string) {
    const res = await fetch('/api/onboard/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId, email: userEmail, fullName: name }),
    })
    const json = await res.json()
    if (!res.ok) { setFormError(json.error || 'Failed to join'); setLoading(false); return }
    router.push('/broker/dashboard')
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <p className="text-slate-400 text-sm">Verifying invite…</p>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center max-w-sm w-full">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Invalid Invite</h2>
          <p className="text-slate-400 text-sm">{errorMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-[#0f2240] rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">WireChase</span>
          </div>
          {inviteInfo && (
            <div className="bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-xl px-4 py-3 text-sm">
              <p className="text-[#c9a84c]">You've been invited to join</p>
              <p className="text-white font-bold text-base mt-0.5">{inviteInfo.brokerageName}</p>
              <p className="text-slate-400 text-xs mt-0.5">as {inviteInfo.role === 'admin' ? 'an Admin' : 'a Loan Officer'}</p>
            </div>
          )}
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          {formError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {formError}
            </div>
          )}

          {step === 'signup' ? (
            <>
              <h2 className="text-white font-bold text-lg mb-1">Create your account</h2>
              <p className="text-slate-400 text-sm mb-5">Set up your login to accept this invite.</p>
              <form onSubmit={handleSignupAndJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Your Full Name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Jane Smith"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} required type="email" placeholder="you@example.com"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
                  <input value={password} onChange={e => setPassword(e.target.value)} required type="password" placeholder="Choose a strong password"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-[#c9a84c] hover:bg-[#a8893a] disabled:opacity-60 text-[#0f2240] font-semibold py-2.5 rounded-lg text-sm transition-colors">
                  {loading ? 'Joining…' : 'Create Account & Join →'}
                </button>
              </form>
              <p className="text-center text-xs text-slate-500 mt-4">
                Already have an account?{' '}
                <button onClick={() => setStep('join')} className="text-[#c9a84c] hover:underline">Sign in instead</button>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-white font-bold text-lg mb-1">Accept invite</h2>
              <p className="text-slate-400 text-sm mb-5">Confirm your name to join the brokerage.</p>
              <form onSubmit={handleJoinExisting} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Your Full Name</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Jane Smith"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#c9a84c]" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-[#c9a84c] hover:bg-[#a8893a] disabled:opacity-60 text-[#0f2240] font-semibold py-2.5 rounded-lg text-sm transition-colors">
                  {loading ? 'Joining…' : 'Accept & Go to Dashboard →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
