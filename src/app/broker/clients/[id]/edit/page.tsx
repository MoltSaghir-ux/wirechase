'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import Link from 'next/link'

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? '')

      const { data } = await supabase
        .from('clients')
        .select('full_name, email')
        .eq('id', id)
        .eq('broker_id', user.id)
        .single()

      if (data) {
        setFullName(data.full_name)
        setEmail(data.email)
      }
      setFetching(false)
    }
    load()
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('clients')
      .update({ full_name: fullName.trim().slice(0, 100), email: email.trim().toLowerCase().slice(0, 200) })
      .eq('id', id)

    if (error) {
      setIsError(true)
      setMessage('Failed to update. Try again.')
    } else {
      setIsError(false)
      setMessage('Client updated successfully.')
      setTimeout(() => router.push(`/broker/clients/${id}`), 1000)
    }
    setLoading(false)
  }

  async function handleArchive() {
    if (!confirm('Archive this client? They will be hidden from your dashboard but not deleted.')) return
    await supabase.from('clients').update({ status: 'archived' }).eq('id', id)
    router.push('/broker/dashboard')
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this client and all their documents? This cannot be undone.')) return
    await supabase.from('clients').delete().eq('id', id)
    router.push('/broker/dashboard')
  }

  if (fetching) return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center"><p className="text-gray-400 text-sm">Loading...</p></div>

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={userEmail} />
      <main className="flex-1 px-8 py-8 max-w-2xl">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/broker/dashboard" className="hover:text-blue-600">Dashboard</Link>
          <span>/</span>
          <Link href={`/broker/clients/${id}`} className="hover:text-blue-600">{fullName}</Link>
          <span>/</span>
          <span className="text-gray-700">Edit</span>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Client</h2>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                maxLength={100}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                maxLength={200}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {message && (
              <p className={`text-sm px-4 py-3 rounded-xl border ${isError ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Danger zone */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 mt-5">
          <h3 className="font-semibold text-red-600 mb-4">Danger Zone</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Archive Client</p>
                <p className="text-xs text-gray-400">Hide from dashboard, keep all data</p>
              </div>
              <button
                onClick={handleArchive}
                className="text-sm border border-yellow-300 text-yellow-700 bg-yellow-50 px-4 py-2 rounded-xl hover:bg-yellow-100 transition"
              >
                Archive
              </button>
            </div>
            <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Delete Client</p>
                <p className="text-xs text-gray-400">Permanently remove all data</p>
              </div>
              <button
                onClick={handleDelete}
                className="text-sm border border-red-300 text-red-700 bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
