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
  if (!user) redirect('/auth/login')

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id').eq('user_id', user.id).single()
  if (!broker?.brokerage_id) redirect('/onboard')

  const { data: partners } = await adminSupabase
    .from('referral_partners')
    .select('*, loans(id)')
    .eq('brokerage_id', broker.brokerage_id)
    .order('full_name')

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={user.email ?? ''} />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Referral Partners</h1>
              <p className="text-sm text-gray-400 mt-0.5">Realtors, builders, and other partners who refer loans to you.</p>
            </div>
            <Link href="/broker/referrals/new"
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-700 transition">
              + Add Partner
            </Link>
          </div>

          {(!partners || partners.length === 0) ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="font-semibold text-gray-700 text-lg mb-1">No referral partners yet</h3>
              <p className="text-gray-400 text-sm mb-5">Add the realtors and partners who refer business to you.</p>
              <Link href="/broker/referrals/new"
                className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition">
                Add Your First Partner
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map((p: any) => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between hover:shadow-md transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{p.full_name}</p>
                      <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[p.partner_type] ?? p.partner_type}
                      </span>
                    </div>
                    {p.company && <p className="text-sm text-gray-500 mt-0.5">{p.company}</p>}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {p.email && <span className="text-xs text-gray-400">{p.email}</span>}
                      {p.phone && <span className="text-xs text-gray-400">{p.phone}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{p.loans?.length ?? 0}</p>
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
