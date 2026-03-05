'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'login') {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const json = await res.json()
        if (!res.ok) {
          setIsError(true)
          setMessage(json.error ?? 'Invalid email or password.')
          setLoading(false)
          return
        }
        router.push('/broker/dashboard')
        router.refresh()
      } catch (err: any) {
        setIsError(true)
        setMessage(`Login error: ${err?.message ?? 'Unknown error'}`)
        setLoading(false)
      }
    } else {
      try {
        const signupRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const signupJson = await signupRes.json()
        if (!signupRes.ok) {
          setIsError(true)
          setMessage(signupJson.error ?? 'Failed to create account.')
          setLoading(false)
          return
        }
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const loginJson = await loginRes.json()
        if (!loginRes.ok) {
          setIsError(false)
          setMessage('Account created! Please sign in.')
          setLoading(false)
          return
        }
        router.push('/onboard')
        router.refresh()
      } catch (err: any) {
        setIsError(true)
        setMessage(`Signup error: ${err?.message ?? 'Unknown error'}`)
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">

      {/* Left: Branding panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[#0f2240] p-12 text-white">
        <Logo size="lg" />

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-black leading-tight mb-4">Sign in to WireChase</h1>
            <p className="text-white/70 text-lg">The modern mortgage broker platform — pipeline, communication, and AI in one place.</p>
          </div>

          <div className="space-y-4">
            {[
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
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <p className="text-blue-100 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-8 pt-4 border-t border-white/10">
            {[['500+', 'Brokers'], ['12k+', 'Documents processed'], ['98%', 'Client satisfaction']].map(([val, label]) => (
              <div key={label}>
                <p className="text-white font-bold text-lg">{val}</p>
                <p className="text-blue-300 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form panel */}
      <div className="flex items-center justify-center p-8 bg-[#f8fafc]">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Logo size="md" />
            <div className="mt-3 h-0.5 w-12 rounded-full bg-[#c9a84c]" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {mode === 'login' ? 'Sign in to WireChase' : 'Create your account'}
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            {mode === 'login' ? 'Welcome back — your pipeline is waiting.' : 'Start managing your mortgage pipeline today.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm placeholder:text-gray-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm placeholder:text-gray-400"
              />
            </div>

            {message && (
              <div className={`text-sm px-4 py-3 rounded-xl border ${
                isError
                  ? 'text-red-600 bg-red-50 border-red-200'
                  : 'text-green-700 bg-green-50 border-green-200'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f2240] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#1a3560] disabled:opacity-50 transition shadow-sm"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}
              className="text-[#c9a84c] font-semibold hover:underline"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

    </div>
  )
}
