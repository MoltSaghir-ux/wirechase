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
  const complete = clients?.filter(c => c.status === 'complete').length ?? 0

  function getStatusStyle(status: string) {
    if (status === 'complete') return 'bg-green-100 text-green-700'
    if (status === 'in_progress') return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Nav email={user.email ?? ''} />

      <main className="flex-1 px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">Track your clients and document requests</p>
          </div>
          <Link
            href="/broker/clients/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + Add Client
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Clients', value: total },
            { label: 'Pending', value: pending },
            { label: 'Complete', value: complete },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 px-6 py-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Client list */}
        {clients && clients.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {clients.map((client: any) => {
              const totalDocs = client.document_requests?.length ?? 0
              const uploadedDocs = client.document_requests?.filter((d: any) => d.status !== 'missing').length ?? 0
              const pct = totalDocs ? Math.round((uploadedDocs / totalDocs) * 100) : 0

              return (
                <Link
                  key={client.id}
                  href={`/broker/clients/${client.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium text-gray-900">{client.full_name}</p>
                    <p className="text-sm text-gray-400">{client.email}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Progress bar */}
                    <div className="w-32">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{uploadedDocs}/{totalDocs} docs</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getStatusStyle(client.status)}`}>
                      {client.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-20 text-center">
            <p className="text-gray-400 text-sm">No clients yet.</p>
            <Link href="/broker/clients/new" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
              Add your first client →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
