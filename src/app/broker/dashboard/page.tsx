import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/ui/Nav'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clients } = await supabase
    .from('clients')
    .select(`id, full_name, email, status, created_at, document_requests (id, status)`)
    .eq('broker_id', user.id)
    .order('created_at', { ascending: false })

  const total = clients?.length ?? 0
  const pending = clients?.filter(c => c.status === 'pending').length ?? 0
  const inProgress = clients?.filter(c => c.status === 'in_progress').length ?? 0
  const complete = clients?.filter(c => c.status === 'complete').length ?? 0

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={user.email ?? ''} />

      <main className="flex-1 px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-400 text-sm mt-0.5">Manage your clients and document requests</p>
          </div>
          <Link
            href="/broker/clients/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
          >
            <span className="text-base leading-none">+</span> Add Client
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Clients', value: total, color: 'bg-blue-50 text-blue-600', icon: '👥' },
            { label: 'Pending', value: pending, color: 'bg-yellow-50 text-yellow-600', icon: '⏳' },
            { label: 'In Progress', value: inProgress, color: 'bg-purple-50 text-purple-600', icon: '📂' },
            { label: 'Complete', value: complete, color: 'bg-green-50 text-green-600', icon: '✓' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3 ${stat.color}`}>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Client list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">All Clients</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{total} total</span>
          </div>

          {clients && clients.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {/* Table header */}
              <div className="grid grid-cols-12 px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <span className="col-span-4">Client</span>
                <span className="col-span-4">Progress</span>
                <span className="col-span-2">Docs</span>
                <span className="col-span-2">Status</span>
              </div>

              {clients.map((client: any) => {
                const totalDocs = client.document_requests?.length ?? 0
                const uploadedDocs = client.document_requests?.filter((d: any) => d.status !== 'missing').length ?? 0
                const pct = totalDocs ? Math.round((uploadedDocs / totalDocs) * 100) : 0

                return (
                  <Link
                    key={client.id}
                    href={`/broker/clients/${client.id}`}
                    className="grid grid-cols-12 items-center px-6 py-4 hover:bg-gray-50/80 transition"
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-white text-xs font-bold">
                          {client.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{client.full_name}</p>
                        <p className="text-xs text-gray-400">{client.email}</p>
                      </div>
                    </div>

                    <div className="col-span-4 pr-6">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{pct}% uploaded</p>
                    </div>

                    <div className="col-span-2">
                      <span className="text-sm font-medium text-gray-700">{uploadedDocs}</span>
                      <span className="text-sm text-gray-400">/{totalDocs}</span>
                    </div>

                    <div className="col-span-2">
                      <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                        client.status === 'complete' ? 'bg-green-100 text-green-700' :
                        client.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {client.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📁</span>
              </div>
              <p className="text-gray-500 font-medium">No clients yet</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">Add your first client to get started</p>
              <Link href="/broker/clients/new" className="text-blue-600 text-sm font-medium hover:underline">
                Add your first client →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
