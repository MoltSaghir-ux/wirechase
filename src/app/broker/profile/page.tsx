'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Nav from '@/components/ui/Nav'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [userEmail, setUserEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [nmls, setNmls] = useState('')
  const [brokerageName, setBrokerageName] = useState('')
  const [brokerageNmls, setBrokerageNmls] = useState('')
  const [role, setRole] = useState('')
  const [brokerageId, setBrokerageId] = useState('')
  const [loading, setLoading] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')

      const { data } = await supabase
        .from('brokers')
        .select('full_name, company, phone, nmls, role, brokerage_id, brokerages (name, nmls)')
        .eq('id', user.id)
        .single()

      if (data) {
        setFullName(data.full_name ?? '')
        setCompany(data.company ?? '')
        setPhone(data.phone ?? '')
        setNmls(data.nmls ?? '')
        setRole(data.role ?? '')
        setBrokerageId(data.brokerage_id ?? '')
        const b = data.brokerages as any
        if (b) { setBrokerageName(b.name ?? ''); setBrokerageNmls(b.nmls ?? '') }
      }
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('brokers').upsert({
      id: user.id, email: user.email ?? '',
      full_name: fullName.trim().slice(0, 100),
      company: company.trim().slice(0, 100),
      phone: phone.trim().slice(0, 30),
      nmls: nmls.trim().slice(0, 20),
    }, { onConflict: 'id' })

    // If admin, update brokerage name too
    if (role === 'admin' && brokerageId) {
      await supabase.from('brokerages').update({
        name: brokerageName.trim().slice(0, 100),
        nmls: brokerageNmls.trim().slice(0, 20),
      }).eq('id', brokerageId)
    }

    setIsError(!!error)
    setMessage(error ? 'Failed to save.' : 'Profile saved!')
    if (!error) setTimeout(() => setMessage(''), 3000)
    setLoading(false)
  }

  async function handleLeaveBrokerage() {
    if (!confirm('Leave this brokerage? You will need a new invite to rejoin.')) return
    setLeaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await fetch('/api/broker/team/leave', { method: 'POST' })
    router.push('/onboard')
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={userEmail} />
      <main className="flex-1 px-8 py-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Profile & Settings</h2>
        <p className="text-gray-400 text-sm mb-7">Your info appears on client portals and emails.</p>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Personal */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Personal Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:bg-white"
                  placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:bg-white"
                  placeholder="(313) 555-0100" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input value={userEmail} disabled className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-100 text-gray-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Personal NMLS #</label>
                <input type="text" value={nmls} onChange={e => setNmls(e.target.value)} maxLength={20}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:bg-white"
                  placeholder="123456" />
              </div>
            </div>
          </div>

          {/* Brokerage */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Brokerage</h3>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${role === 'admin' ? 'bg-blue-100 text-[#0f2240]' : 'bg-gray-100 text-gray-500'}`}>
                {role === 'admin' ? 'Admin' : 'Loan Officer'}
              </span>
            </div>
            {brokerageId ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name {role !== 'admin' && <span className="text-gray-400 font-normal">(read only)</span>}</label>
                    <input type="text" value={brokerageName} onChange={e => setBrokerageName(e.target.value)} maxLength={100}
                      disabled={role !== 'admin'}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] ${role === 'admin' ? 'bg-gray-50 focus:bg-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Company NMLS #</label>
                    <input type="text" value={brokerageNmls} onChange={e => setBrokerageNmls(e.target.value)} maxLength={20}
                      disabled={role !== 'admin'}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c] ${role === 'admin' ? 'bg-gray-50 focus:bg-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`} />
                  </div>
                </div>
                <button type="button" onClick={handleLeaveBrokerage} disabled={leaving}
                  className="text-sm text-red-500 hover:underline disabled:opacity-50">
                  {leaving ? 'Leaving...' : '→ Leave this brokerage'}
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-3">Not part of a brokerage</p>
                <button type="button" onClick={() => router.push('/onboard')}
                  className="text-sm text-[#0f2240] border border-blue-200 bg-[#fdf6e3] px-4 py-2 rounded-xl hover:bg-blue-100 transition">
                  Join or Create a Brokerage
                </button>
              </div>
            )}
          </div>

          {message && (
            <p className={`text-sm px-4 py-3 rounded-xl border ${isError ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>
              {message}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-[#0f2240] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#1a3560] disabled:opacity-50 transition shadow-sm">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </main>
    </div>
  )
}
