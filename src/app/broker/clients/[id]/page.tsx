import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect, notFound } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import Link from 'next/link'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: client } = await supabase
    .from('clients')
    .select(`
      id, full_name, email, status, invite_token, created_at,
      document_requests (id, label, status, required, category, notes)
    `)
    .eq('id', id)
    .eq('broker_id', user.id) // security: ensure this client belongs to this broker
    .single()

  if (!client) notFound()

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/client/upload/${client.invite_token}`
  const docs = client.document_requests ?? []
  const categories = [...new Set(docs.map((d: any) => d.category ?? 'Documents'))]
  const uploaded = docs.filter((d: any) => d.status !== 'missing').length

  function getDocStyle(status: string) {
    if (status === 'approved') return 'bg-green-100 text-green-700'
    if (status === 'uploaded') return 'bg-blue-100 text-blue-700'
    if (status === 'rejected') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-400'
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Nav email={user.email ?? ''} />

      <main className="flex-1 px-8 py-8 max-w-3xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/broker/dashboard" className="hover:text-gray-600">Dashboard</Link>
          <span>/</span>
          <span className="text-gray-700">{client.full_name}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{client.full_name}</h2>
              <p className="text-gray-500 text-sm mt-1">{client.email}</p>
              <p className="text-gray-400 text-xs mt-1">
                Added {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${
              client.status === 'complete' ? 'bg-green-100 text-green-700' :
              client.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {client.status.replace('_', ' ')}
            </span>
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-600">Documents</span>
              <span className="font-medium text-gray-900">{uploaded}/{docs.length} uploaded</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: docs.length ? `${(uploaded / docs.length) * 100}%` : '0%' }}
              />
            </div>
          </div>

          {/* Invite link */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Client upload link</p>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 truncate">
                {inviteLink}
              </code>
              <button
                onClick={`navigator.clipboard.writeText('${inviteLink}')` as any}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs hover:bg-gray-200 transition whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Documents by category */}
        <div className="space-y-4">
          {categories.map((cat: any) => (
            <div key={cat} className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">{cat}</h3>
              <div className="space-y-2">
                {docs.filter((d: any) => (d.category ?? 'Documents') === cat).map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${doc.status === 'missing' ? 'bg-gray-300' : 'bg-green-400'}`} />
                      <div>
                        <p className="text-sm text-gray-800">{doc.label}</p>
                        {doc.required && <p className="text-xs text-red-400">Required</p>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getDocStyle(doc.status)}`}>
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
