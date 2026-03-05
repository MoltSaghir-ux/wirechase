'use client'
import Link from 'next/link'

const PIPELINE_STAGES = [
  { key: 'application', label: 'Application', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  { key: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { key: 'submitted_uw', label: 'In UW', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  { key: 'conditional_approval', label: 'Cond. Approval', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  { key: 'clear_to_close', label: 'CTC', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'closing', label: 'Closing', color: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
  { key: 'funded', label: 'Funded', color: 'bg-green-100 text-green-700', dot: 'bg-green-600' },
]

type PipelineClient = {
  id: string
  full_name: string
  email: string
  created_at: string
  document_requests?: { status: string }[]
}

export default function PipelineView({
  clients,
  loanByClient,
}: {
  clients: PipelineClient[]
  loanByClient: Record<string, { loan_stage: string; file_number: string | null }>
}) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {PIPELINE_STAGES.map(stage => {
          const stageClients = clients.filter(c => (loanByClient[c.id]?.loan_stage ?? 'application') === stage.key)
          return (
            <div key={stage.key} className="w-56 flex-shrink-0">
              <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-3 ${stage.color}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                  <span className="text-xs font-semibold">{stage.label}</span>
                </div>
                <span className="text-xs font-bold opacity-70">{stageClients.length}</span>
              </div>
              <div className="space-y-2">
                {stageClients.length === 0 && (
                  <div className="border-2 border-dashed border-gray-100 rounded-xl h-16 flex items-center justify-center">
                    <span className="text-xs text-gray-300">Empty</span>
                  </div>
                )}
                {stageClients.map(client => {
                  const totalDocs = client.document_requests?.length ?? 0
                  const uploadedDocs = client.document_requests?.filter(d => d.status !== 'missing').length ?? 0
                  const pct = totalDocs ? Math.round((uploadedDocs / totalDocs) * 100) : 0
                  const daysAgo = Math.floor((Date.now() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24))
                  const fileNum = loanByClient[client.id]?.file_number
                  return (
                    <Link key={client.id} href={`/broker/clients/${client.id}`} className="block bg-white border border-gray-100 rounded-xl p-3 hover:border-blue-200 hover:shadow-sm transition">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-bold">
                            {client.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{client.full_name}</p>
                          {fileNum && <p className="text-[10px] text-gray-400 font-mono">{fileNum}</p>}
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1 mb-1.5">
                        <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] text-gray-400">{uploadedDocs}/{totalDocs} docs</span>
                        <span className="text-[10px] text-gray-400">{daysAgo}d ago</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
