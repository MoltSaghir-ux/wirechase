import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import Link from 'next/link'
import ResendEmailButton from '@/components/ui/ResendEmailButton'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select(`id, full_name, email, status, invite_token, created_at, document_requests (id, label, status, required, category, notes)`)
    .eq('id', id)
    .eq('broker_id', user.id)
    .single()

  if (!client) notFound()

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/client/upload/${client.invite_token}`
  const docs = client.document_requests ?? []
  const categories = [...new Set(docs.map((d: any) => d.category ?? 'Documents'))]
  const uploaded = docs.filter((d: any) => d.status !== 'missing').length
  const pct = docs.length ? Math.round((uploaded / docs.length) * 100) : 0

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Nav email={user.email ?? ''} />

      <main className="flex-1 px-8 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/broker/dashboard" className="hover:text-blue-600 transition">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{client.full_name}</span>
        </div>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">
                  {client.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{client.full_name}</h2>
                <p className="text-gray-400 text-sm">{client.email}</p>
                <p className="text-gray-300 text-xs mt-0.5">
                  Added {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            <span className={`text-sm px-3 py-1.5 rounded-full font-medium capitalize ${
              client.status === 'complete' ? 'bg-green-100 text-green-700' :
              client.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {client.status.replace('_', ' ')}
            </span>
          </div>

          {/* Progress */}
          <div className="mt-5 grid grid-cols-3 gap-4 pt-5 border-t border-gray-100">
            <div>
              <p className="text-2xl font-bold text-gray-900">{docs.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Total Documents</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{uploaded}</p>
              <p className="text-xs text-gray-400 mt-0.5">Uploaded</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-500">{docs.length - uploaded}</p>
              <p className="text-xs text-gray-400 mt-0.5">Still Needed</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Overall progress</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Invite link + email */}
          <div className="mt-5 pt-5 border-t border-gray-100 flex items-center gap-3 flex-wrap">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500 truncate min-w-0">
              {inviteLink}
            </code>
            <ResendEmailButton clientId={client.id} />
            <Link
              href={`/broker/clients/${client.id}/edit`}
              className="text-sm bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              ✎ Edit Client
            </Link>
          </div>
        </div>

        {/* Documents by category */}
        <div className="space-y-4">
          {categories.map((cat: any) => {
            const catDocs = docs.filter((d: any) => (d.category ?? 'Documents') === cat)
            const catUploaded = catDocs.filter((d: any) => d.status !== 'missing').length
            return (
              <div key={cat} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700 text-sm">{cat}</h3>
                  <span className="text-xs text-gray-400">{catUploaded}/{catDocs.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {catDocs.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          doc.status === 'approved' ? 'bg-green-400' :
                          doc.status === 'uploaded' ? 'bg-blue-400' :
                          doc.status === 'rejected' ? 'bg-red-400' :
                          'bg-gray-200'
                        }`} />
                        <div>
                          <p className="text-sm text-gray-800">{doc.label}</p>
                          {doc.required && <p className="text-xs text-red-400">Required</p>}
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                        doc.status === 'approved' ? 'bg-green-100 text-green-700' :
                        doc.status === 'uploaded' ? 'bg-blue-100 text-blue-700' :
                        doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
