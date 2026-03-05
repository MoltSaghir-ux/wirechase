import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import Nav from '@/components/ui/Nav'
import Link from 'next/link'
import ResendEmailButton from '@/components/ui/ResendEmailButton'
import SMSButton from '@/components/ui/SMSButton'
import { isTwilioConfigured } from '@/lib/twilio'
import AddDocDropdown from '@/components/ui/AddDocDropdown'
import DocViewer from '@/components/ui/DocViewer'
import DocReview from '@/components/ui/DocReview'
import ClientNotes from '@/components/ui/ClientNotes'
import ActivityLog from '@/components/ui/ActivityLog'
import LoanStageTracker from '@/components/ui/LoanStageTracker'
import LoanConditions from '@/components/ui/LoanConditions'
import LoanTasks from '@/components/ui/LoanTasks'
import ExportDropdown from '@/components/ui/ExportDropdown'
import ReferralPartnerPanel from '@/components/ui/ReferralPartnerPanel'
import PreApprovalButton from '@/components/ui/PreApprovalButton'
import BulkApproveButton from '@/components/ui/BulkApproveButton'
import LOERequestButton from '@/components/ui/LOERequestButton'
import StackingOrder from '@/components/ui/StackingOrder'
import type { DocumentRequest, ActivityEntry } from '@/lib/types'
import { LOAN_TYPE_LABELS, LOAN_PURPOSE_LABELS, EMPLOYMENT_TYPE_LABELS, PROPERTY_TYPE_LABELS } from '@/lib/loan-doc-engine'

type DisplayDocument = { id: string; file_name: string; file_size: number | null; uploaded_at: string; document_request_id: string }

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function getDocExpiryDays(label: string): number {
  const l = label.toLowerCase()
  if (l.includes('pay stub') || l.includes('paystub')) return 30
  if (l.includes('bank statement')) return 60
  if (l.includes('w-2') || l.includes('w2')) return 365
  if (l.includes('tax return') || l.includes('1040')) return 365
  if (l.includes('profit') || l.includes('loss') || l.includes('p&l')) return 60
  if (l.includes('voe') || l.includes('verification of employment')) return 90
  if (l.includes('credit')) return 120
  return 90 // default
}

const adminSupabase = createAdminSupabaseClient()

export default async function ClientDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab = tab ?? 'overview'

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

  // Fetch client — admins use service role filtered to their brokerage; LOs use session (RLS enforced)
  const { data: client } = isAdmin
    ? await adminSupabase
        .from('clients')
        .select('id, full_name, email, phone, status, invite_token, created_at, broker_id, document_requests (id, label, status, required, category, notes, created_at, doc_type, date_range_start, date_range_end, borrower_type)')
        .eq('id', id)
        .eq('brokerage_id', broker.brokerage_id)
        .single()
    : await supabase
        .from('clients')
        .select('id, full_name, email, phone, status, invite_token, created_at, broker_id, document_requests (id, label, status, required, category, notes, created_at, doc_type, date_range_start, date_range_end, borrower_type)')
        .eq('id', id)
        .eq('broker_id', user.id)
        .single()

  if (!client) notFound()

  // Fetch uploaded documents via admin client (bypasses RLS gap on documents table)
  const docIds = client.document_requests.map((d: DocumentRequest) => d.id)
  const { data: allFiles } = docIds.length > 0
    ? await adminSupabase.from('documents').select('id, file_name, file_size, uploaded_at, document_request_id').in('document_request_id', docIds)
    : { data: [] }

  // Group files by document_request_id
  const filesByDocId: Record<string, DisplayDocument[]> = {}
  for (const f of allFiles ?? []) {
    if (!filesByDocId[f.document_request_id]) filesByDocId[f.document_request_id] = []
    filesByDocId[f.document_request_id].push(f)
  }

  // Fetch loan record
  const { data: loan } = await adminSupabase
    .from('loans')
    .select('id, loan_type, loan_purpose, loan_amount, purchase_price, employment_type, co_borrower, co_borrower_name, co_borrower_email, co_borrower_invite_token, property_type, property_use, property_address, loan_stage, file_number, rate_lock_expiry, closing_date, title_company, lo_nmls, property_county, property_state, property_zip, borrower_dob, borrower_ssn_last4, referral_partner_id, referral_notes, referral_partners(id, full_name)')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch activity log
  const { data: activities } = await adminSupabase
    .from('activity_log')
    .select('id, event, detail, created_at')
    .eq('client_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/client/upload/${client.invite_token}`
  const docs = client.document_requests ?? []
  const categories = [...new Set(docs.map((d: any) => d.category ?? 'Documents'))]
  const uploaded = docs.filter((d: DocumentRequest) => d.status !== 'missing').length
  const pct = docs.length ? Math.round((uploaded / docs.length) * 100) : 0
  const existingLabels = docs.map((d: DocumentRequest) => d.label)

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={user.email ?? ''} />

      <main className="flex-1 px-4 sm:px-8 py-8 pt-[72px] lg:pt-8 max-w-4xl w-full">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/broker/dashboard" className="hover:text-[#0f2240] transition">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{client.full_name}</span>
        </div>

        {/* Rate lock expiry amber banner */}
        {loan?.rate_lock_expiry && new Date(loan.rate_lock_expiry) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Rate Lock Expiring Soon</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Rate lock expires {new Date(loan.rate_lock_expiry).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — take action now to avoid repricing.
              </p>
            </div>
          </div>
        )}

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">
                  {client.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{client.full_name}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-gray-400 text-sm">{client.email}</p>
                  {client.phone && (
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <span className="text-gray-300">·</span>
                      <a href={`tel:${client.phone}`} className="hover:text-blue-500 transition">{client.phone}</a>
                    </p>
                  )}
                </div>
                <p className="text-gray-300 text-xs mt-0.5">
                  Added {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm px-3 py-1.5 rounded-full font-medium capitalize ${
                client.status === 'complete' ? 'bg-green-100 text-green-700' :
                client.status === 'in_progress' ? 'bg-blue-100 text-[#0f2240]' :
                client.status === 'archived' ? 'bg-gray-100 text-gray-400' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {client.status.replace('_', ' ')}
              </span>
              <Link href={`/broker/clients/${client.id}/edit`} className="text-sm bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
                ✎ Edit
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-3 gap-4 pt-5 border-t border-gray-100">
            <div><p className="text-2xl font-bold text-gray-900">{docs.length}</p><p className="text-xs text-gray-400 mt-0.5">Total Documents</p></div>
            <div><p className="text-2xl font-bold text-green-600">{uploaded}</p><p className="text-xs text-gray-400 mt-0.5">Uploaded</p></div>
            <div><p className="text-2xl font-bold text-yellow-500">{docs.length - uploaded}</p><p className="text-xs text-gray-400 mt-0.5">Still Needed</p></div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Overall progress</span><span>{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-[#fdf6e3]0 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500 truncate min-w-0">{inviteLink}</code>
            <ResendEmailButton clientId={client.id} />
            <SMSButton
              clientId={client.id}
              clientName={client.full_name}
              clientPhone={client.phone}
              twilioConfigured={isTwilioConfigured()}
            />
          </div>

          {/* Status page link */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs text-gray-400 flex-shrink-0">Status page:</span>
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-500 truncate min-w-0">
                {`${process.env.NEXT_PUBLIC_APP_URL}/client/status/${client.invite_token}`}
              </code>
            </div>
            <a
              href={`/client/status/${client.invite_token}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition flex-shrink-0"
            >
              Preview →
            </a>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex items-center mb-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto whitespace-nowrap">
          {([
            { key: 'overview', label: 'Overview', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>, badge: null },
            { key: 'documents', label: 'Documents', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>, badge: docs.length - uploaded > 0 ? docs.length - uploaded : null },
            { key: 'conditions', label: 'Conditions', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>, badge: null },
            { key: 'notes', label: 'Notes & Activity', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>, badge: null },
          ] as { key: string; label: string; icon: ReactNode; badge: number | null }[]).map(t => (
            <Link
              key={t.key}
              href={`/broker/clients/${client.id}?tab=${t.key}`}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm transition flex-1 justify-center border-b-2 ${
                activeTab === t.key
                  ? 'border-[#0f2240] text-[#0f2240] font-semibold bg-[#fdf6e3]/40'
                  : 'border-transparent text-gray-500 font-medium hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.badge && t.badge > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === t.key ? 'bg-blue-100 text-[#0f2240]' : 'bg-red-100 text-red-600'}`}>
                  {t.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Loan Stage Tracker */}
            {loan && (
              <LoanStageTracker
                loanId={loan.id}
                currentStage={(loan.loan_stage ?? 'processing') as any}
                isDenied={loan.loan_stage === 'denied'}
              />
            )}

            {/* Loan Summary Card */}
            {loan && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800 text-sm">Loan Details</h3>
                  <div className="flex items-center gap-2">
                    {loan.file_number && (
                      <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg">{loan.file_number}</span>
                    )}
                    <ExportDropdown loanId={loan.id} fileNumber={loan.file_number} />
                    <PreApprovalButton
                      loanId={loan.id}
                      clientName={client.full_name}
                      loanAmount={loan.loan_amount}
                      purchasePrice={loan.purchase_price}
                      loanType={loan.loan_type}
                      loanPurpose={loan.loan_purpose}
                      propertyAddress={loan.property_address}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Loan Type</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{LOAN_TYPE_LABELS[loan.loan_type as keyof typeof LOAN_TYPE_LABELS] ?? loan.loan_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Purpose</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{LOAN_PURPOSE_LABELS[loan.loan_purpose as keyof typeof LOAN_PURPOSE_LABELS] ?? loan.loan_purpose}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Employment</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{EMPLOYMENT_TYPE_LABELS[loan.employment_type as keyof typeof EMPLOYMENT_TYPE_LABELS] ?? loan.employment_type}</p>
                  </div>
                  {loan.purchase_price && (
                    <div>
                      <p className="text-xs text-gray-400">{loan.loan_purpose === 'purchase' ? 'Purchase Price' : 'Home Value'}</p>
                      <p className="font-semibold text-gray-800 mt-0.5">${Number(loan.purchase_price).toLocaleString()}</p>
                    </div>
                  )}
                  {loan.loan_amount && (
                    <div>
                      <p className="text-xs text-gray-400">Loan Amount</p>
                      <p className="font-semibold text-gray-800 mt-0.5">${Number(loan.loan_amount).toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400">Property Type</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{PROPERTY_TYPE_LABELS[loan.property_type as keyof typeof PROPERTY_TYPE_LABELS] ?? loan.property_type}</p>
                  </div>
                  {loan.property_address && (
                    <div className="col-span-3">
                      <p className="text-xs text-gray-400">Property Address</p>
                      <p className="font-semibold text-gray-800 mt-0.5">{loan.property_address}</p>
                    </div>
                  )}
                  {(loan.property_state || loan.property_zip || loan.property_county) && (
                    <div>
                      <p className="text-xs text-gray-400">Property Location</p>
                      <p className="font-semibold text-gray-800 mt-0.5">
                        {[loan.property_county, loan.property_state, loan.property_zip].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                  {loan.closing_date && (
                    <div>
                      <p className="text-xs text-gray-400">Closing Date</p>
                      <p className="font-semibold text-gray-800 mt-0.5">
                        {new Date(loan.closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {loan.rate_lock_expiry && (
                    <div>
                      <p className="text-xs text-gray-400">Rate Lock Expiry</p>
                      <p className={`font-semibold mt-0.5 ${
                        new Date(loan.rate_lock_expiry) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                          ? 'text-red-600' : 'text-gray-800'
                      }`}>
                        {new Date(loan.rate_lock_expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {new Date(loan.rate_lock_expiry) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 inline ml-1"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>}
                      </p>
                    </div>
                  )}
                  {loan.title_company && (
                    <div>
                      <p className="text-xs text-gray-400">Title Company</p>
                      <p className="font-semibold text-gray-800 mt-0.5">{loan.title_company}</p>
                    </div>
                  )}
                </div>

                {/* Referral Partner section */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <ReferralPartnerPanel
                    loanId={loan.id}
                    currentPartnerId={(loan as any).referral_partner_id ?? null}
                    currentPartnerName={(loan as any).referral_partners?.full_name ?? null}
                    referralNotes={(loan as any).referral_notes ?? null}
                  />
                </div>

                {/* Co-borrower section */}
                {loan.co_borrower && loan.co_borrower_name && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">Co-Borrower</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-600 text-xs font-bold">
                            {loan.co_borrower_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{loan.co_borrower_name}</p>
                          <p className="text-xs text-gray-400">{loan.co_borrower_email}</p>
                        </div>
                      </div>
                      {loan.co_borrower_invite_token && (
                        <a
                          href={`/coborrower/upload/${loan.co_borrower_invite_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[#0f2240] hover:underline font-medium"
                        >
                          Co-Borrower Portal →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Document Checklist</h3>
              <AddDocDropdown clientId={client.id} existingLabels={existingLabels} />
            </div>

            {(() => {
              const uploadedDocIds = docs.filter((d: DocumentRequest) => d.status === 'uploaded').map((d: DocumentRequest) => d.id)
              return (
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  {uploadedDocIds.length > 0 && (
                    <BulkApproveButton docIds={uploadedDocIds} onDone={() => { if (typeof window !== 'undefined') window.location.reload() }} />
                  )}
                  <LOERequestButton clientId={client.id} loanId={loan?.id} />
                  <StackingOrder docs={docs.map((d: DocumentRequest) => ({ id: d.id, label: d.label, status: d.status, doc_type: (d as any).doc_type }))} />
                </div>
              )
            })()}

            <div className="space-y-4">
              {categories.map((cat: string) => {
                const catDocs = docs.filter((d: DocumentRequest) => (d.category ?? 'Documents') === cat)
                const catUploaded = catDocs.filter((d: DocumentRequest) => d.status !== 'missing').length
                return (
                  <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-700 text-sm">{cat}</h3>
                      <span className="text-xs text-gray-400">{catUploaded}/{catDocs.length}</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {catDocs.map((doc: DocumentRequest) => {
                        const files = filesByDocId[doc.id] ?? []
                        return (
                          <div key={doc.id} className="px-6 py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  doc.status === 'approved' ? 'bg-green-400' :
                                  doc.status === 'uploaded' ? 'bg-blue-400' :
                                  doc.status === 'rejected' ? 'bg-red-400' : 'bg-gray-200'
                                }`} />
                                <div>
                                  <p className="text-sm text-gray-800">{doc.label}</p>
                                  {(doc as any).doc_type && (
                                    <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 inline flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg> {(doc as any).doc_type}{(doc as any).borrower_type === 'co_borrower' ? ' · Co-Borrower' : ''}{(doc as any).date_range_start ? ` · ${new Date((doc as any).date_range_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}</p>
                                  )}
                                  {doc.required && <p className="text-xs text-red-400">Required</p>}
                                  {(doc as any).status === 'missing' && (doc as any).created_at && (() => {
                                    const days = Math.floor((Date.now() - new Date((doc as any).created_at).getTime()) / (1000 * 60 * 60 * 24))
                                    if (days === 0) return null
                                    return (
                                      <p className={`text-xs mt-0.5 ${days >= 14 ? 'text-red-400 font-medium' : days >= 7 ? 'text-amber-500' : 'text-gray-400'}`}>
                                        ⏱ Requested {days} day{days !== 1 ? 's' : ''} ago{days >= 14 ? ' — follow up!' : ''}
                                      </p>
                                    )
                                  })()}
                                </div>
                              </div>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                                doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                                doc.status === 'uploaded' ? 'bg-blue-100 text-[#0f2240]' :
                                doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-400'
                              }`}>
                                {doc.status}
                              </span>
                            </div>

                            {files.length > 0 && (
                              <div className="mt-3 ml-5 space-y-2">
                                {files.map((file: DisplayDocument) => (
                                  <div key={file.id} className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                                        <div className="min-w-0">
                                          <p className="text-xs font-medium text-gray-700 truncate">{file.file_name}</p>
                                          <p className="text-xs text-gray-400">
                                            {file.file_size ? `${(file.file_size / 1024).toFixed(0)} KB · ` : ''}
                                            {relativeTime(file.uploaded_at)}
                                          </p>
                                          {(() => {
                                            if (doc.status !== 'approved' && doc.status !== 'uploaded') return null
                                            const expiryDays = getDocExpiryDays(doc.label)
                                            const uploadedAt = new Date(file.uploaded_at)
                                            const expiresAt = new Date(uploadedAt.getTime() + expiryDays * 24 * 60 * 60 * 1000)
                                            const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                            if (daysLeft > 30) return null
                                            if (daysLeft <= 0) return (
                                              <p className="text-xs text-red-500 font-semibold mt-0.5 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 inline flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg> Expired — request new</p>
                                            )
                                            return (
                                              <p className={`text-xs mt-0.5 font-medium ${daysLeft <= 7 ? 'text-red-400' : 'text-amber-500'}`}>
                                                ⏰ Expires in {daysLeft}d
                                              </p>
                                            )
                                          })()}
                                        </div>
                                      </div>
                                      <DocViewer docId={file.id} fileName={file.file_name} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <DocReview
                              docRequestId={doc.id}
                              currentStatus={doc.status}
                              docType={(doc as any).doc_type ?? null}
                              dateRangeStart={(doc as any).date_range_start ?? null}
                              dateRangeEnd={(doc as any).date_range_end ?? null}
                              borrowerType={(doc as any).borrower_type ?? null}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Conditions Tab */}
        {activeTab === 'conditions' && (
          <>
            {loan ? (
              <LoanConditions loanId={loan.id} clientId={client.id} />
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                <p className="text-gray-400 text-sm">No loan on file yet</p>
              </div>
            )}
          </>
        )}

        {/* Notes & Activity Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {loan && (
              <LoanTasks loanId={loan.id} clientId={client.id} />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ClientNotes clientId={client.id} />
              <ActivityLog activities={activities ?? []} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
