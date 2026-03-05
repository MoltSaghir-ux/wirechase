import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const adminSupabase = createAdminSupabaseClient()

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
  high:   { label: 'High',   color: 'bg-amber-100 text-amber-700' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-500' },
}

export default async function TasksPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id').eq('user_id', user.id).single()
  if (!broker?.brokerage_id) redirect('/onboard')

  const { data: tasks } = await adminSupabase
    .from('loan_tasks')
    .select('*, clients(full_name, id)')
    .eq('brokerage_id', broker.brokerage_id)
    .neq('status', 'done')
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true, nullsFirst: false })

  const now = new Date()

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Tasks</h1>
          <p className="text-sm text-gray-400 mt-0.5">All open tasks across your pipeline.</p>
        </div>
        <span className="text-sm text-gray-400">{tasks?.length ?? 0} open</span>
      </div>

      {(!tasks || tasks.length === 0) ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="font-semibold text-gray-700 text-lg mb-1">All caught up!</h3>
          <p className="text-gray-400 text-sm">No open tasks across your pipeline.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task: any) => {
            const dueDate = task.due_date ? new Date(task.due_date) : null
            const isOverdue = dueDate && dueDate < now
            const isDueSoon = dueDate && !isOverdue && (dueDate.getTime() - now.getTime()) < 2 * 86400000
            const cfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal

            return (
              <div key={task.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-gray-900 text-sm">{task.title}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      {isOverdue && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Overdue</span>}
                    </div>
                    {task.description && <p className="text-xs text-gray-400 mb-2">{task.description}</p>}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link href={`/broker/clients/${(task.clients as any)?.id}`} className="text-xs text-blue-600 hover:underline">
                        👤 {(task.clients as any)?.full_name}
                      </Link>
                      {task.assigned_to_name && (
                        <span className="text-xs text-gray-400">Assigned to: {task.assigned_to_name}</span>
                      )}
                      {dueDate && (
                        <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-gray-400'}`}>
                          Due: {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
