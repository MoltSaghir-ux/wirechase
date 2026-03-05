import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import TeamManager from '@/components/ui/TeamManager'
import type { TeamInvite } from '@/lib/types'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export default async function TeamPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: broker } = await adminSupabase
    .from('brokers')
    .select('role, brokerage_id, full_name, nmls, brokerages (id, name, nmls)')
    .eq('id', user.id)
    .single()

  if (!broker?.brokerage_id) redirect('/onboard')

  const isAdmin = broker.role === 'admin'

  const brokerage = broker.brokerages as unknown as { id: string; name: string; nmls: string | null }

  // Get all team members (needed for both admin and LO views)
  const { data: members } = await adminSupabase
    .from('brokers')
    .select('id, full_name, email, role, created_at')
    .eq('brokerage_id', broker.brokerage_id)
    .order('full_name')

  if (!isAdmin) {
    const currentBroker = {
      full_name: broker.full_name as string | null,
      lo_nmls: broker.nmls as string | null,
    }

    return (
      <div className="flex min-h-screen bg-[#f8fafc]">
        <Nav email={user.email ?? ''} />
        <main className="flex-1 overflow-auto pt-[52px] lg:pt-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Team</h1>
              <p className="text-sm text-gray-400 mt-0.5">Your brokerage and team members.</p>
            </div>

            {/* Own profile card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">
                    {(currentBroker?.full_name ?? user.email ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{currentBroker?.full_name ?? user.email}</p>
                  <p className="text-sm text-gray-400">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">Loan Officer</span>
                    {currentBroker?.lo_nmls && (
                      <span className="text-xs text-gray-400 font-mono">NMLS# {currentBroker.lo_nmls}</span>
                    )}
                  </div>
                </div>
              </div>
              {brokerage && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Brokerage</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{brokerage.name}</p>
                  {brokerage.nmls && <p className="text-xs text-gray-400 font-mono mt-0.5">NMLS# {brokerage.nmls}</p>}
                </div>
              )}
            </div>

            {/* Team members — read only */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Your Team</h2>
              <div className="space-y-3">
                {(members ?? []).map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {(m.full_name ?? m.email ?? '?').slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.full_name ?? m.email}</p>
                      {m.full_name && <p className="text-xs text-gray-400 truncate">{m.email}</p>}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      m.role === 'admin' ? 'bg-blue-100 text-[#0f2240]' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {m.role === 'admin' ? 'Admin' : 'Loan Officer'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
                Contact your admin to update team settings or add members.
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Admin view — full team management
  // Get pending invites
  const { data: invites } = await adminSupabase
    .from('team_invites')
    .select('id, email, role, created_at, accepted_at')
    .eq('brokerage_id', broker.brokerage_id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={user.email ?? ''} />
      <main className="flex-1 px-4 sm:px-8 py-8 pt-[72px] lg:pt-8 max-w-3xl w-full">
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
          invites={(invites ?? []).filter((i: TeamInvite) => !i.accepted_at)}
        />
      </main>
    </div>
  )
}
