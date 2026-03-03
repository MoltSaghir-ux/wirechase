import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import TeamManager from '@/components/ui/TeamManager'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function TeamPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: broker } = await adminSupabase
    .from('brokers')
    .select('role, brokerage_id, brokerages (id, name, nmls)')
    .eq('id', user.id)
    .single()

  if (!broker?.brokerage_id) redirect('/onboard')
  if (broker.role !== 'admin') redirect('/broker/dashboard')

  const brokerage = broker.brokerages as any

  // Get all team members
  const { data: members } = await adminSupabase
    .from('brokers')
    .select('id, full_name, email, role, created_at')
    .eq('brokerage_id', broker.brokerage_id)
    .order('created_at')

  // Get pending invites
  const { data: invites } = await adminSupabase
    .from('team_invites')
    .select('id, email, role, created_at, accepted_at')
    .eq('brokerage_id', broker.brokerage_id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={user.email ?? ''} />
      <main className="flex-1 px-8 py-8 max-w-3xl">
        <div className="mb-7">
          <h2 className="text-2xl font-bold text-gray-900">{brokerage.name}</h2>
          <p className="text-gray-400 text-sm mt-0.5">
            Team Management {brokerage.nmls ? `· NMLS #${brokerage.nmls}` : ''}
          </p>
        </div>
        <TeamManager
          brokerageId={broker.brokerage_id}
          currentUserId={user.id}
          members={members ?? []}
          invites={(invites ?? []).filter((i: any) => !i.accepted_at)}
        />
      </main>
    </div>
  )
}
