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
  const [loading, setLoading] = useState(false)
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
        .select('full_name, company, phone, nmls')
        .eq('id', user.id)
        .single()

      if (data) {
        setFullName(data.full_name ?? '')
        setCompany(data.company ?? '')
        setPhone(data.phone ?? '')
        setNmls(data.nmls ?? '')
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
      id: user.id,
      email: user.email ?? '',
      full_name: fullName.trim().slice(0, 100),
      company: company.trim().slice(0, 100),
      phone: phone.trim().slice(0, 30),
      nmls: nmls.trim().slice(0, 20),
    }, { onConflict: 'id' })

    if (error) {
      setIsError(true)
      setMessage('Failed to save. Try again.')
    } else {
      setIsError(false)
      setMessage('Profile saved!')
      setTimeout(() => setMessage(''), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={userEmail} />
      <main className="flex-1 px-8 py-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Broker Profile</h2>
        <p className="text-gray-400 text-sm mb-7">This information appears on client-facing portals and emails.</p>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Personal Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={100}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="(313) 555-0100" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={userEmail} disabled
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-100 text-gray-400 cursor-not-allowed" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Company Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)} maxLength={100}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="ABC Mortgage LLC" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">NMLS #</label>
                <input type="text" value={nmls} onChange={e => setNmls(e.target.value)} maxLength={20}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="123456" />
              </div>
            </div>
          </div>

          {message && (
            <p className={`text-sm px-4 py-3 rounded-xl border ${isError ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>
              {message}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm">
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </main>
    </div>
  )
}
