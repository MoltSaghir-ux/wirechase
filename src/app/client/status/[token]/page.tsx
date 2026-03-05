import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

const adminSupabase = createAdminSupabaseClient()

const STAGES = [
  { key: 'application', label: 'Application Received', desc: 'Your application has been received and is being prepared.' },
  { key: 'processing', label: 'Processing', desc: 'Your loan is being processed and documents are being reviewed.' },
  { key: 'submitted_uw', label: 'Submitted to Underwriting', desc: 'Your loan package has been submitted to the underwriter for review.' },
  { key: 'conditional_approval', label: 'Conditional Approval', desc: 'Underwriting has conditionally approved your loan. A few items may still be needed.' },
  { key: 'clear_to_close', label: 'Clear to Close', desc: 'Your loan has been cleared! Closing is being scheduled.' },
  { key: 'closing', label: 'Closing', desc: 'Your closing is scheduled. Review all documents carefully before signing.' },
  { key: 'funded', label: 'Funded', desc: 'Congratulations! Your loan has been funded.' },
]

export default async function BorrowerStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Fetch client by invite_token
  const { data: client } = await adminSupabase
    .from('clients')
    .select('id, full_name, status, created_at, document_requests(id, label, status, required, category)')
    .eq('invite_token', token)
    .single()

  if (!client) notFound()

  // Fetch loan
  const { data: loan } = await adminSupabase
    .from('loans')
    .select('id, loan_type, loan_purpose, loan_amount, purchase_price, loan_stage, property_address, closing_date, rate_lock_expiry')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const LOAN_TYPE_LABELS: Record<string, string> = { conventional: 'Conventional', fha: 'FHA', va: 'VA', usda: 'USDA', jumbo: 'Jumbo' }
  const LOAN_PURPOSE_LABELS: Record<string, string> = { purchase: 'Purchase', refinance: 'Refinance', cashout: 'Cash-Out Refi', heloc: 'HELOC' }

  const docs = (client.document_requests ?? []) as Array<{ id: string; label: string; status: string; required: boolean; category: string }>
  const totalDocs = docs.length
  const uploadedDocs = docs.filter((d) => d.status !== 'missing').length
  const approvedDocs = docs.filter((d) => d.status === 'approved').length
  const missingDocs = docs.filter((d) => d.status === 'missing')
  const uploadedNotApproved = docs.filter((d) => d.status === 'uploaded')
  const pct = totalDocs ? Math.round((uploadedDocs / totalDocs) * 100) : 0

  const currentStageKey = loan?.loan_stage ?? 'application'
  const currentStageIdx = STAGES.findIndex(s => s.key === currentStageKey)
  const currentStage = STAGES[currentStageIdx] ?? STAGES[0]
  const isDenied = loan?.loan_stage === 'denied'

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#0f2240] rounded-lg flex items-center justify-center">
              <span className="text-[#c9a84c] font-bold text-sm">W</span>
            </div>
            <span className="font-bold text-gray-900">WireChase</span>
          </div>
          <Link href={`/client/upload/${token}`}
            className="text-xs bg-[#c9a84c] hover:bg-[#a8893a] text-[#0f2240] px-3 py-1.5 rounded-lg font-semibold transition">
            Upload Documents →
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
        {/* Welcome card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-900">Hi, {client.full_name.split(' ')[0]}!</h1>
          <p className="text-gray-400 text-sm mt-0.5">Here&apos;s the current status of your loan application.</p>

          {loan && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <span className="text-xs bg-[#fdf6e3] text-[#0f2240] font-semibold px-2.5 py-1 rounded-full">
                {LOAN_TYPE_LABELS[loan.loan_type] ?? loan.loan_type}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full">
                {LOAN_PURPOSE_LABELS[loan.loan_purpose] ?? loan.loan_purpose}
              </span>
              {(loan.loan_amount ?? loan.purchase_price) && (
                <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full">
                  ${Number(loan.loan_amount ?? loan.purchase_price).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Loan stage */}
        {isDenied ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <p className="font-bold text-red-700 text-lg">Unfortunately, your loan application was not approved.</p>
            <p className="text-red-600 text-sm mt-1">Please contact your loan officer to discuss your options.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4 text-sm">Loan Progress</h2>

            {/* Stage steps */}
            <div className="space-y-3">
              {STAGES.map((stage, i) => {
                const isComplete = i < currentStageIdx
                const isCurrent = i === currentStageIdx
                return (
                  <div key={stage.key} className={`flex items-start gap-3 p-3 rounded-xl transition ${isCurrent ? 'bg-[#fdf6e3] border border-[#c9a84c]/30 shadow-sm' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      isComplete ? 'bg-green-500 text-white' :
                      isCurrent ? 'bg-[#0f2240] text-white shadow-lg shadow-[#0f2240]/20' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {isComplete ? '✓' : <span className="text-xs">{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isCurrent ? 'text-[#0f2240]' : isComplete ? 'text-gray-600' : 'text-gray-400'}`}>
                        {stage.label}
                        {isCurrent && <span className="ml-2 text-[10px] bg-[#c9a84c] text-[#0f2240] px-1.5 py-0.5 rounded-full font-bold">Current</span>}
                      </p>
                      {isCurrent && <p className="text-xs text-[#0f2240]/70 mt-0.5">{stage.desc}</p>}
                    </div>
                  </div>
                )
              })}
            </div>

            {loan?.closing_date && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">Estimated Closing Date</p>
                <p className="font-semibold text-gray-800 mt-0.5">
                  {new Date(loan.closing_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Document status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 text-sm">Your Documents</h2>
            <span className="text-xs text-gray-400">{approvedDocs}/{totalDocs} approved</span>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>{uploadedDocs} of {totalDocs} submitted</span>
              <span className="font-semibold text-[#0f2240]">{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-[#c9a84c] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {missingDocs.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Still Needed</p>
              <div className="space-y-1.5">
                {missingDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {doc.label}
                    {doc.required && <span className="text-[10px] text-red-400 font-semibold">Required</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadedNotApproved.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-[#0f2240] uppercase tracking-wide mb-2">Under Review</p>
              <div className="space-y-1.5">
                {uploadedNotApproved.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] flex-shrink-0" />
                    {doc.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {missingDocs.length > 0 && (
            <Link href={`/client/upload/${token}`}
              className="mt-3 block w-full text-center bg-[#0f2240] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1a3560] transition">
              Upload Missing Documents →
            </Link>
          )}

          {missingDocs.length === 0 && loan?.loan_stage === 'funded' && approvedDocs === totalDocs && totalDocs > 0 ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-[#c9a84c]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#c9a84c]"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              </div>
              <p className="text-green-700 font-bold text-lg">Congratulations!</p>
              <p className="text-green-600 font-semibold text-sm mt-0.5">Your loan has been funded.</p>
              <p className="text-gray-400 text-xs mt-1.5">Welcome home — all documents approved and funding complete.</p>
            </div>
          ) : missingDocs.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-green-600 font-semibold text-sm">All documents submitted!</p>
              <p className="text-gray-400 text-xs mt-0.5">We&apos;ll notify you if anything else is needed.</p>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Questions? Contact your loan officer directly. · Powered by WireChase
        </p>
      </div>
    </div>
  )
}
