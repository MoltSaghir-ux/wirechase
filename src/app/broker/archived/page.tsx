import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/ui/Nav'
import type { ClientStatus } from '@/lib/types'

type ArchivedClient = { id: string; full_name: string; email: string; created_at: string; status?: ClientStatus }

const adminSupabase = createAdminSupabaseClient()

export default async function ArchivedPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: broker } = await adminSupabase
    .from('brokers')
    .select('role, brokerage_id')
    .eq('id', user.id)
    .single()

  if (!broker?.brokerage_id) redirect('/onboard')
  const isAdmin = broker.role === 'admin'

  const { data: clients } = isAdmin
    ? await adminSupabase
        .from('clients')
        .select('id, full_name, email, created_at')
        .eq('brokerage_id', broker.brokerage_id)
        .eq('status', 'archived')
        .order('created_at', { ascending: false })
    : await supabase
        .from('clients')
        .select('id, full_name, email, created_at')
        .eq('broker_id', user.id)
        .eq('status', 'archived')
        .order('created_at', { ascending: false })

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={user.email ?? ''} />
      <main className="flex-1 px-8 py-8 max-w-3xl">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/broker/dashboard" className="hover:text-blue-600">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-700">Archived</span>
        </div>

        <h2 className="text-2xl font-bold text-[#0f2240] mb-6">Archived Clients</h2>

        {clients && clients.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {clients.map((client: ArchivedClient) => (
              <div key={client.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-gray-700">{client.full_name}</p>
                  <p className="text-sm text-gray-400">{client.email}</p>
                </div>
                <Link
                  href={`/broker/clients/${client.id}/edit`}
                  className="text-sm font-semibold text-[#0f2240] hover:text-[#c9a84c] transition"
                >
                  Restore / Edit
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3 mx-auto">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v0a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium text-sm">No archived clients</p>
            <p className="text-gray-300 text-xs mt-1">Archived clients will appear here</p>
          </div>
        )}
      </main>
    </div>
  )
}
