import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

const adminSupabase = createAdminSupabaseClient()

const STAGE_CONFIG: Record<string, { label: string; color: string; bar: string }> = {
  application:          { label: 'Application',         color: 'text-gray-600',    bar: 'bg-gray-400' },
  processing:           { label: 'Processing',           color: 'text-blue-600',    bar: 'bg-blue-500' },
  submitted_uw:         { label: 'Submitted to UW',      color: 'text-purple-600',  bar: 'bg-purple-500' },
  conditional_approval: { label: 'Conditional Approval', color: 'text-amber-600',   bar: 'bg-amber-500' },
  clear_to_close:       { label: 'Clear to Close',       color: 'text-emerald-600', bar: 'bg-emerald-500' },
  closing:              { label: 'Closing',              color: 'text-teal-600',    bar: 'bg-teal-500' },
  funded:               { label: 'Funded',               color: 'text-green-600',   bar: 'bg-green-500' },
  denied:               { label: 'Denied',               color: 'text-red-600',     bar: 'bg-red-400' },
}

const TYPE_LABELS: Record<string, string> = {
  conventional: 'Conventional', fha: 'FHA', va: 'VA', usda: 'USDA', jumbo: 'Jumbo', unknown: 'Other'
}

const TYPE_COLORS: Record<string, string> = {
  conventional: 'bg-blue-500', fha: 'bg-purple-500', va: 'bg-green-500',
  usda: 'bg-teal-500', jumbo: 'bg-amber-500', unknown: 'bg-gray-400'
}

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n}`
}

export default async function ReportsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id').eq('user_id', user.id).single()
  if (!broker?.brokerage_id) redirect('/onboard')

  // Inline data fetch (same logic as API route)
  const { data: loans } = await adminSupabase
    .from('loans')
    .select('id, loan_stage, loan_amount, purchase_price, loan_type, created_at, closing_date, clients(brokerage_id)')
    .order('created_at', { ascending: true })

  const brokerageLoans = (loans ?? []).filter((l: any) => l.clients?.brokerage_id === broker.brokerage_id)

  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const start = d.toISOString()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
    const ml = brokerageLoans.filter(l => l.created_at >= start && l.created_at < end)
    return { label, count: ml.length, volume: ml.reduce((s, l) => s + Number(l.loan_amount ?? l.purchase_price ?? 0), 0) }
  })

  const stageCounts: Record<string, number> = {}
  const typeCounts: Record<string, number> = {}
  for (const l of brokerageLoans) {
    const s = l.loan_stage ?? 'application'
    stageCounts[s] = (stageCounts[s] ?? 0) + 1
    const t = l.loan_type ?? 'unknown'
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  }

  const total = brokerageLoans.length
  const funded = brokerageLoans.filter(l => l.loan_stage === 'funded').length
  const active = brokerageLoans.filter(l => !['funded', 'denied', 'withdrawn'].includes(l.loan_stage ?? '')).length
  const denied = brokerageLoans.filter(l => l.loan_stage === 'denied').length
  const closeRate = total > 0 ? Math.round((funded / total) * 100) : 0
  const totalVolume = brokerageLoans.reduce((s, l) => s + Number(l.loan_amount ?? l.purchase_price ?? 0), 0)
  const avgLoan = total > 0 ? Math.round(totalVolume / total) : 0
  const fundedWithDates = brokerageLoans.filter(l => l.loan_stage === 'funded' && l.closing_date && l.created_at)
  const avgDaysToClose = fundedWithDates.length > 0
    ? Math.round(fundedWithDates.reduce((s, l) => s + (new Date(l.closing_date!).getTime() - new Date(l.created_at).getTime()) / 86400000, 0) / fundedWithDates.length)
    : null

  const maxBarCount = Math.max(...months.map(m => m.count), 1)

  const stats = [
    { label: 'Total Loans', value: total, sub: 'all time', accent: 'from-white to-gray-50/60', border: 'border-gray-200' },
    { label: 'Active', value: active, sub: 'in pipeline', accent: 'from-white to-blue-50/40', border: 'border-blue-100' },
    { label: 'Funded', value: funded, sub: 'closed', accent: 'from-white to-green-50/40', border: 'border-green-100' },
    { label: 'Denied', value: denied, sub: 'not approved', accent: 'from-white to-red-50/30', border: 'border-red-100' },
    { label: 'Close Rate', value: `${closeRate}%`, sub: 'funded / total', accent: 'from-white to-emerald-50/40', border: 'border-emerald-100' },
    { label: 'Avg Loan Size', value: fmt(avgLoan), sub: 'per file', accent: 'from-white to-purple-50/40', border: 'border-purple-100' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Pipeline performance and loan volume overview.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.accent} border ${s.border} rounded-2xl p-4 shadow-sm hover:-translate-y-0.5 transition-transform`}>
            <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly bar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-6">Monthly Loan Volume</h2>
          <div className="flex items-end gap-3 h-36">
            {months.map(m => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-blue-600 font-bold">{m.count > 0 ? m.count : ''}</span>
                <div
                  className="w-full rounded-t-lg bg-blue-500 transition-all"
                  style={{
                    height: `${Math.max((m.count / maxBarCount) * 100, m.count > 0 ? 8 : 2)}%`,
                    minHeight: '3px',
                    opacity: m.count === 0 ? 0.15 : 1,
                  }}
                />
                <span className="text-[10px] text-gray-400">{m.label}</span>
              </div>
            ))}
          </div>
          {totalVolume > 0 && (
            <p className="text-xs text-gray-400 mt-4 text-center">Total pipeline: {fmt(totalVolume)}</p>
          )}
        </div>

        {/* Avg days to close */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center items-center text-center">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Avg. Days to Close</h2>
          {avgDaysToClose !== null ? (
            <>
              <p className="text-6xl font-black text-gray-900">{avgDaysToClose}</p>
              <p className="text-sm text-gray-400 mt-2">days from application to funded</p>
              <p className="text-xs text-gray-300 mt-1">Based on {fundedWithDates.length} funded loan{fundedWithDates.length !== 1 ? 's' : ''}</p>
            </>
          ) : (
            <>
              <p className="text-4xl mb-3">📊</p>
              <p className="text-sm text-gray-400">Not enough data yet</p>
              <p className="text-xs text-gray-300 mt-1">Appears once loans are funded with closing dates</p>
            </>
          )}
        </div>
      </div>

      {/* Stage breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Pipeline by Stage</h2>
        {total === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No loans yet.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(STAGE_CONFIG).map(([key, cfg]) => {
              const count = stageCounts[key] ?? 0
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              if (count === 0) return null
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-400">{count} · {pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${cfg.bar} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Loan type breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Loans by Type</h2>
        {total === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No loans yet.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              const barColor = TYPE_COLORS[type] ?? 'bg-gray-400'
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{TYPE_LABELS[type] ?? type}</span>
                    <span className="text-xs text-gray-400">{count} · {pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
