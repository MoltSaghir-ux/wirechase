import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id, full_name, email, status, created_at,
      document_requests (id, status)
    `)
    .eq('broker_id', user.id)
    .order('created_at', { ascending: false })

  function getStatusColor(status: string) {
    if (status === 'complete') return 'bg-green-100 text-green-700'
    if (status === 'in_progress') return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">WireChase</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <form action="/api/auth/logout" method="POST">
            <button className="text-sm text-red-500 hover:underline">Sign out</button>
          </form>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Page title + action */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
            <p className="text-gray-500 text-sm mt-1">{clients?.length ?? 0} total</p>
          </div>
          <Link
            href="/broker/clients/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + Add Client
          </Link>
        </div>

        {/* Client list */}
        {clients && clients.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {clients.map((client: any) => {
              const total = client.document_requests?.length ?? 0
              const uploaded = client.document_requests?.filter((d: any) => d.status !== 'missing').length ?? 0

              return (
                <Link
                  key={client.id}
                  href={`/broker/clients/${client.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium text-gray-900">{client.full_name}</p>
                    <p className="text-sm text-gray-500">{client.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{uploaded}/{total} docs</p>
                      <p className="text-xs text-gray-400">uploaded</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getStatusColor(client.status)}`}>
                      {client.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
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
