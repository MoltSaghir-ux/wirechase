import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id').eq('id', user.id).single()
  if (!broker?.brokerage_id) return NextResponse.json({})

  // Fetch all loans for this brokerage with their clients
  const { data: loans } = await adminSupabase
    .from('loans')
    .select('id, loan_stage, loan_amount, purchase_price, loan_type, created_at, closing_date, clients(brokerage_id)')
    .order('created_at', { ascending: true })

  const brokerageLoans = (loans ?? []).filter((l: any) => l.clients?.brokerage_id === broker.brokerage_id)

  // Monthly volume (last 6 months)
  const now = new Date()
  const months: { label: string; count: number; volume: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const start = d.toISOString()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
    const monthLoans = brokerageLoans.filter(l => l.created_at >= start && l.created_at < end)
    const volume = monthLoans.reduce((sum, l) => sum + Number(l.loan_amount ?? l.purchase_price ?? 0), 0)
    months.push({ label, count: monthLoans.length, volume })
  }

  // Stage breakdown
  const stageCounts: Record<string, number> = {}
  for (const l of brokerageLoans) {
    const s = l.loan_stage ?? 'application'
    stageCounts[s] = (stageCounts[s] ?? 0) + 1
  }

  // Loan type breakdown
  const typeCounts: Record<string, number> = {}
  for (const l of brokerageLoans) {
    const t = l.loan_type ?? 'unknown'
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  }

  // Totals
  const total = brokerageLoans.length
  const funded = brokerageLoans.filter(l => l.loan_stage === 'funded').length
  const active = brokerageLoans.filter(l => !['funded', 'denied', 'withdrawn'].includes(l.loan_stage ?? '')).length
  const denied = brokerageLoans.filter(l => l.loan_stage === 'denied').length
  const closeRate = total > 0 ? Math.round((funded / total) * 100) : 0
  const totalVolume = brokerageLoans.reduce((sum, l) => sum + Number(l.loan_amount ?? l.purchase_price ?? 0), 0)
  const avgLoan = total > 0 ? Math.round(totalVolume / total) : 0

  // Avg days to funded (from created_at to closing_date for funded loans)
  const fundedWithDates = brokerageLoans.filter(l => l.loan_stage === 'funded' && l.closing_date && l.created_at)
  const avgDaysToClose = fundedWithDates.length > 0
    ? Math.round(fundedWithDates.reduce((sum, l) => {
        const diff = (new Date(l.closing_date!).getTime() - new Date(l.created_at).getTime()) / 86400000
        return sum + diff
      }, 0) / fundedWithDates.length)
    : null

  return NextResponse.json({
    total, funded, active, denied, closeRate, totalVolume, avgLoan, avgDaysToClose,
    monthlyVolume: months,
    stageCounts,
    typeCounts,
  })
}
