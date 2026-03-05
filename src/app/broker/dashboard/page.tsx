import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/ui/Nav'
import { Suspense } from 'react'
import DashboardSearch from '@/components/ui/DashboardSearch'
import PipelineView from '@/components/ui/PipelineView'
import type { ClientStatus, DocStatus } from '@/lib/types'

type DashboardClient = {
  id: string; full_name: string; email: string; status: ClientStatus
  created_at: string; broker_id: string
  document_requests?: { id: string; status: DocStatus }[]
}

const STAGE_COLORS: Record<string, string> = {
  application: 'bg-gray-100 text-gray-600',
  processing: 'bg-blue-100 text-blue-700',
  submitted_uw: 'bg-purple-100 text-purple-700',
  conditional_approval: 'bg-amber-100 text-amber-700',
  clear_to_close: 'bg-emerald-100 text-emerald-700',
  closing: 'bg-teal-100 text-teal-700',
  funded: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-700',
}
const STAGE_LABELS: Record<string, string> = {
  application: 'Application',
  processing: 'Processing',
  submitted_uw: 'In UW',
  conditional_approval: 'Cond. Approval',
  clear_to_close: 'CTC',
  closing: 'Closing',
  funded: 'Funded',
  denied: 'Denied',
}

const adminSupabase = createAdminSupabaseClient()

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; view?: string }> }) {
  const { filter, q, view } = await searchParams
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get broker role + brokerage
  const { data: broker } = await adminSupabase
    .from('brokers')
    .select('role, brokerage_id')
    .eq('id', user.id)
    .single()

  if (!broker?.brokerage_id) redirect('/onboard')

  const isAdmin = broker.role === 'admin'

  const { data: allClients } = isAdmin
    ? await adminSupabase
        .from('clients')
        .select(`id, full_name, email, status, created_at, broker_id, document_requests (id, status)`)
        .eq('brokerage_id', broker.brokerage_id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
    : await supabase
        .from('clients')
        .select(`id, full_name, email, status, created_at, broker_id, document_requests (id, status)`)
        .eq('broker_id', user.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })

  // Fetch latest loan stage per client
  const clientIds = (allClients ?? []).map(c => c.id)
  const { data: loanStages } = clientIds.length > 0
    ? await adminSupabase
        .from('loans')
        .select('client_id, loan_stage, file_number')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Build a map: client_id → most recent loan
  const loanByClient: Record<string, { loan_stage: string; file_number: string | null }> = {}
  for (const loan of loanStages ?? []) {
    if (!loanByClient[loan.client_id]) loanByClient[loan.client_id] = loan
  }

  // Fetch open condition counts
  const { data: conditionCounts } = clientIds.length > 0
    ? await adminSupabase
        .from('loan_conditions')
        .select('client_id')
        .in('client_id', clientIds)
        .eq('status', 'open')
    : { data: [] }

  const openConditionsByClient: Record<string, number> = {}
  for (const c of conditionCounts ?? []) {
    openConditionsByClient[c.client_id] = (openConditionsByClient[c.client_id] ?? 0) + 1
  }

  const clients = allClients ?? []
  const total = clients.length
  const pending = clients.filter(c => c.status === 'pending').length
  const inProgress = clients.filter(c => c.status === 'in_progress').length
  const complete = clients.filter(c => c.status === 'complete').length
  const totalOpenConditions = Object.values(openConditionsByClient).reduce((a, b) => a + b, 0)

  const filtered = clients.filter(c =>
    (!filter || c.status === filter) &&
    (!q || c.full_name.toLowerCase().includes(q.toLowerCase()))
  )

  const stats = [
    { label: 'Active Files', value: total, icon: '📂', color: 'text-blue-600 bg-blue-50', filter: null },
    { label: 'Pending Docs', value: pending, icon: '⏳', color: 'text-yellow-600 bg-yellow-50', filter: 'pending' },
    { label: 'In Progress', value: inProgress, icon: '🔄', color: 'text-purple-600 bg-purple-50', filter: 'in_progress' },
    { label: 'Complete', value: complete, icon: '✓', color: 'text-green-600 bg-green-50', filter: 'complete' },
    { label: 'Open Conditions', value: totalOpenConditions, icon: '⚠️', color: 'text-red-600 bg-red-50', filter: null },
  ]

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={user.email ?? ''} />

      <main className="flex-1 px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {isAdmin ? 'All brokerage clients' : 'Your clients only'}
              {' · '}
              <span className={`font-medium ${isAdmin ? 'text-blue-500' : 'text-purple-500'}`}>
                {isAdmin ? 'Admin' : 'Loan Officer'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Suspense fallback={null}>
              <DashboardSearch defaultValue={q ?? ''} />
            </Suspense>
            <div className="flex items-center gap-2">
              <Link
                href={`/broker/dashboard?${new URLSearchParams({ ...(filter ? { filter } : {}), ...(q ? { q } : {}), view: 'list' }).toString()}`}
                className={`p-2 rounded-lg border text-sm transition ${view !== 'pipeline' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
              >
                ☰
              </Link>
              <Link
                href={`/broker/dashboard?${new URLSearchParams({ ...(filter ? { filter } : {}), ...(q ? { q } : {}), view: 'pipeline' }).toString()}`}
                className={`p-2 rounded-lg border text-sm transition ${view === 'pipeline' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-400 hover:text-gray-600'}`}
              >
                ⊞
              </Link>
            </div>
            <Link href="/broker/loans/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
              <span className="text-base leading-none">+</span> Add Client
            </Link>
          </div>
        </div>

        {/* Clickable stat cards */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-8">
          {stats.map(stat => (
            <Link
              key={stat.label}
              href={stat.filter ? `/broker/dashboard?filter=${stat.filter}` : '/broker/dashboard'}
              className={`bg-gradient-to-br from-white to-blue-50/40 rounded-2xl border shadow-sm px-5 py-4 transition hover:shadow-md hover:-translate-y-0.5 ${
                stat.filter && filter === stat.filter ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base mb-3 ${stat.color}`}>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-0.5">{stat.label}</p>
            </Link>
          ))}
        </div>

        {/* Pipeline view */}
        {view === 'pipeline' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Pipeline View</h3>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{filtered.length} shown</span>
            </div>
            <PipelineView clients={filtered} loanByClient={loanByClient} openConditionsByClient={openConditionsByClient} />
          </div>
        ) : (
          /* Client list */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800">
                  {filter ? `${filter.replace('_', ' ')} clients` : 'All Clients'}
                </h3>
                {filter && (
                  <Link href="/broker/dashboard" className="text-xs text-blue-500 hover:underline">Clear filter</Link>
                )}
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{filtered.length} shown</span>
            </div>

            {clients.length === 0 ? (
              <div className="py-24 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <span className="text-3xl">📁</span>
                </div>
                <h3 className="text-gray-700 font-semibold text-lg mb-1">No loan files yet</h3>
                <p className="text-gray-400 text-sm mb-5">Submit your first loan to get started</p>
                <Link href="/broker/loans/new" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                  + Submit New Loan
                </Link>
              </div>
            ) : filtered.length > 0 ? (
              <div className="divide-y divide-gray-50">
                <div className="grid grid-cols-12 px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <span className="col-span-4">Client</span>
                  <span className="col-span-2">Stage</span>
                  <span className="col-span-3">Progress</span>
                  <span className="col-span-1">Conds</span>
                  <span className="col-span-2">Status</span>
                </div>

                {filtered.map((client: DashboardClient) => {
                  const totalDocs = client.document_requests?.length ?? 0
                  const uploadedDocs = client.document_requests?.filter((d: { status: DocStatus }) => d.status !== 'missing').length ?? 0
                  const pct = totalDocs ? Math.round((uploadedDocs / totalDocs) * 100) : 0
                  const loanInfo = loanByClient[client.id]
                  const stageKey = loanInfo?.loan_stage ?? 'application'
                  const stageColor = STAGE_COLORS[stageKey] ?? 'bg-gray-100 text-gray-500'
                  const stageLabel = STAGE_LABELS[stageKey] ?? stageKey
                  const daysAgo = Math.floor((Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24))
                  const openConds = openConditionsByClient[client.id] ?? 0

                  return (
                    <Link key={client.id} href={`/broker/clients/${client.id}`} className="grid grid-cols-12 items-center px-6 py-4 hover:bg-blue-50/30 transition">
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
                        <span className="text-xs text-gray-300 ml-1">{daysAgo}d</span>
                      </div>

                      <div className="col-span-2">
                        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${stageColor}`}>
                          {stageLabel}
                        </span>
                      </div>

                      <div className="col-span-3 pr-6">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{pct}% uploaded</p>
                      </div>

                      <div className="col-span-1">
                        {openConds > 0 && (
                          <span className="inline-flex text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                            {openConds}
                          </span>
                        )}
                      </div>

                      <div className="col-span-2">
                        <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
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
                  <span className="text-2xl">🔍</span>
                </div>
                <p className="text-gray-500 font-medium">No {filter ? filter.replace('_', ' ') : ''} clients{q ? ` matching "${q}"` : ''}</p>
                {(filter || q) && <Link href="/broker/dashboard" className="text-blue-600 text-sm font-medium hover:underline mt-2 inline-block">View all clients</Link>}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
