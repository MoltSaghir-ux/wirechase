import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import Link from 'next/link'

const adminSupabase = createAdminSupabaseClient()

export default async function WelcomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: broker } = await adminSupabase
    .from('brokers')
    .select('full_name, brokerage_id, brokerages(name)')
    .eq('id', user.id)
    .single()

  if (!broker?.brokerage_id) redirect('/onboard')

  const brokerageName = (broker.brokerages as any)?.name ?? 'your brokerage'
  const firstName = broker.full_name?.split(' ')[0] ?? 'there'

  const steps = [
    { label: 'Create your brokerage', done: true, href: null, desc: 'Your account is set up and ready.' },
    { label: 'Add your first loan', done: false, href: '/broker/loans/new', desc: 'Start tracking a loan file.' },
    { label: 'Invite your team', done: false, href: '/broker/team', desc: 'Add loan officers to your brokerage.' },
    { label: 'Complete your profile', done: false, href: '/broker/profile', desc: 'Add your NMLS number and contact info.' },
  ]
  const doneCount = steps.filter(s => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={user.email ?? ''} />
      <main className="flex-1 overflow-auto pt-[52px] lg:pt-0">
        <div className="max-w-2xl mx-auto px-6 py-12">

          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white mb-6 shadow-lg shadow-blue-200">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </div>
            <h1 className="text-3xl font-black mb-2">Welcome to WireChase, {firstName}!</h1>
            <p className="text-blue-100 text-lg">{brokerageName} is all set up. Let&apos;s get you started.</p>
          </div>

          {/* Checklist card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-700">Getting Started</h2>
              <span className="text-xs text-gray-400">{doneCount} of {steps.length} complete</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-4 p-4 rounded-xl transition ${
                    !step.done && step.href ? 'hover:bg-blue-50/50 cursor-pointer' : ''
                  } ${step.done ? 'opacity-60' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    step.done ? 'bg-green-500' : 'bg-gray-100 border-2 border-gray-200'
                  }`}>
                    {step.done ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${step.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                  </div>
                  {!step.done && step.href && (
                    <Link href={step.href} className="text-xs text-blue-600 font-semibold hover:text-blue-700 flex-shrink-0 mt-1">
                      Start →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/broker/dashboard"
            className="block w-full text-center bg-blue-600 text-white font-bold py-3.5 rounded-2xl hover:bg-blue-700 transition shadow-sm shadow-blue-200"
          >
            Go to Dashboard →
          </Link>
        </div>
      </main>
    </div>
  )
}
