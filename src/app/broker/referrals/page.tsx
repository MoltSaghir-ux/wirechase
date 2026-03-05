import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/ui/Nav'

const adminSupabase = createAdminSupabaseClient()

const TYPE_LABELS: Record<string, string> = {
  realtor: 'Realtor', builder: 'Builder', financial_advisor: 'Financial Advisor',
  attorney: 'Attorney', other: 'Other'
}

export default async function ReferralsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: broker } = await adminSupabase.from('brokers').select('role, brokerage_id').eq('id', user.id).single()
  if (!broker?.brokerage_id) redirect('/onboard')

  const isAdmin = broker.role === 'admin'

  let partners: any[] = []
  let loanCountMap: Record<string, number> = {}

  if (isAdmin) {
    const { data } = await adminSupabase
      .from('referral_partners')
      .select('*')
      .eq('brokerage_id', broker.brokerage_id)
      .order('full_name')
    partners = data ?? []

    const { data: loanCounts } = await adminSupabase
      .from('loans')
      .select('referral_partner_id, broker_id, clients(brokerage_id)')
    for (const l of loanCounts ?? []) {
      if (l.referral_partner_id && (l.clients as any)?.brokerage_id === broker.brokerage_id) {
        loanCountMap[l.referral_partner_id] = (loanCountMap[l.referral_partner_id] ?? 0) + 1
      }
    }
  } else {
    const { data: myLoans } = await adminSupabase
      .from('loans')
      .select('referral_partner_id')
      .eq('broker_id', user.id)
      .not('referral_partner_id', 'is', null)

    const partnerIds = [...new Set((myLoans ?? []).map((l: any) => l.referral_partner_id).filter(Boolean))]

    if (partnerIds.length > 0) {
      const { data } = await adminSupabase
        .from('referral_partners')
        .select('*')
        .in('id', partnerIds)
        .order('full_name')
      partners = data ?? []
      for (const l of myLoans ?? []) {
        if (l.referral_partner_id) loanCountMap[l.referral_partner_id] = (loanCountMap[l.referral_partner_id] ?? 0) + 1
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={user.email ?? ''} />
      <main className="flex-1 pt-[52px] lg:pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#0f2240]">Referral Partners</h1>
              <p className="text-sm text-gray-400 mt-0.5">{isAdmin ? 'Realtors, builders, and other partners who refer loans to your brokerage.' : 'Partners associated with your submitted loans.'}</p>
            </div>
            {isAdmin && (
              <Link href="/broker/referrals/new"
                className="bg-[#0f2240] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#1a3560] transition">
                + Add Partner
              </Link>
            )}
          </div>

          {(!partners || partners.length === 0) ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-12 h-12 bg-[#fdf6e3] rounded-2xl flex items-center justify-center mb-3 mx-auto">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
              </div>
              <h3 className="font-semibold text-gray-700 text-lg mb-1">No referral partners yet</h3>
              <p className="text-gray-400 text-sm mb-5">Add the realtors and partners who refer business to you.</p>
              <Link href="/broker/referrals/new"
                className="bg-[#0f2240] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1a3560] transition">
                Add Your First Partner
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map((p: any) => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:shadow-md transition">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{p.full_name}</p>
                      <span className="text-xs bg-[#fdf6e3] text-[#0f2240] font-semibold px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[p.partner_type] ?? p.partner_type}
                      </span>
                    </div>
                    {p.company && <p className="text-sm text-gray-500 mt-0.5">{p.company}</p>}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {p.email && <span className="text-xs text-gray-400">{p.email}</span>}
                      {p.phone && <span className="text-xs text-gray-400">{p.phone}</span>}
                    </div>
                    <div className="sm:hidden mt-2">
                      <span className="text-lg font-bold text-gray-900">{loanCountMap[p.id] ?? 0}</span>
                      <span className="text-xs text-gray-400 ml-1">loans referred</span>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-2xl font-bold text-[#0f2240]">{loanCountMap[p.id] ?? 0}</p>
                    <p className="text-xs text-gray-400">loans referred</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
