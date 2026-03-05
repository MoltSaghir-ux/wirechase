import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: broker } = await adminSupabase.from('brokers').select('role, brokerage_id').eq('id', user.id).single()
  if (!broker?.brokerage_id) return NextResponse.json({ notifications: [] })

  const isAdmin = broker.role === 'admin'
  const notifications: { type: string; message: string; clientId: string; clientName: string; severity: 'high' | 'medium' }[] = []
  const now = new Date()

  // Get active client IDs
  const clientQuery = adminSupabase.from('clients').select('id, full_name').neq('status', 'archived').neq('status', 'complete')
  const { data: clients } = isAdmin
    ? await clientQuery.eq('brokerage_id', broker.brokerage_id)
    : await clientQuery.eq('broker_id', user.id)

  const clientIds = (clients ?? []).map((c: { id: string; full_name: string }) => c.id)
  const clientMap: Record<string, string> = {}
  for (const c of clients ?? []) clientMap[(c as { id: string; full_name: string }).id] = (c as { id: string; full_name: string }).full_name

  if (clientIds.length === 0) return NextResponse.json({ notifications: [] })

  // Rate lock expiring within 7 days
  const rateLockCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data: expiringLocks } = await adminSupabase
    .from('loans')
    .select('client_id, rate_lock_expiry')
    .in('client_id', clientIds)
    .lte('rate_lock_expiry', rateLockCutoff)
    .gte('rate_lock_expiry', now.toISOString().slice(0, 10))

  for (const loan of expiringLocks ?? []) {
    const daysLeft = Math.ceil((new Date(loan.rate_lock_expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    notifications.push({
      type: 'rate_lock',
      message: `Rate lock expires in ${daysLeft}d`,
      clientId: loan.client_id,
      clientName: clientMap[loan.client_id] ?? 'Unknown',
      severity: daysLeft <= 3 ? 'high' : 'medium',
    })
  }

  // Stale open conditions 14+ days
  const staleCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: staleConditions } = await adminSupabase
    .from('loan_conditions')
    .select('client_id')
    .in('client_id', clientIds)
    .eq('status', 'open')
    .lte('created_at', staleCutoff)

  const staleByClient: Record<string, number> = {}
  for (const c of staleConditions ?? []) {
    staleByClient[c.client_id] = (staleByClient[c.client_id] ?? 0) + 1
  }
  for (const [clientId, count] of Object.entries(staleByClient)) {
    notifications.push({
      type: 'stale_condition',
      message: `${count} condition${count !== 1 ? 's' : ''} stale 14+ days`,
      clientId,
      clientName: clientMap[clientId] ?? 'Unknown',
      severity: 'high',
    })
  }

  // Sort: high severity first
  notifications.sort((a, b) => (a.severity === 'high' ? -1 : 1))

  return NextResponse.json({ notifications, count: notifications.length })
}
