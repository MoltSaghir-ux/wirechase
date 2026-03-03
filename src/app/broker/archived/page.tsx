import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/ui/Nav'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Archived Clients</h2>

        {clients && clients.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {clients.map((client: any) => (
              <div key={client.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-gray-700">{client.full_name}</p>
                  <p className="text-sm text-gray-400">{client.email}</p>
                </div>
                <Link
                  href={`/broker/clients/${client.id}/edit`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Restore / Edit
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <p className="text-gray-400 text-sm">No archived clients</p>
          </div>
        )}
      </main>
    </div>
  )
}
