'use client'
import { useState, useEffect } from 'react'

type Task = {
  id: string
  title: string
  description?: string
  assigned_to_name?: string
  due_date?: string
  priority: string
  status: string
  created_at: string
}

type TeamMember = {
  user_id: string
  full_name: string
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
  high:   { label: 'High',   color: 'bg-amber-100 text-amber-700' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-500' },
}

function dueDateColor(dateStr?: string, status?: string): string {
  if (!dateStr || status === 'done') return 'text-gray-400'
  const due = new Date(dateStr)
  const now = new Date()
  const diff = (due.getTime() - now.getTime()) / 86400000
  if (diff < 0) return 'text-red-500 font-semibold'
  if (diff < 2) return 'text-amber-500 font-semibold'
  return 'text-gray-400'
}

export default function LoanTasks({ loanId, clientId }: { loanId: string; clientId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedId, setAssignedId] = useState('')
  const [assignedName, setAssignedName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('normal')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [tasksRes, teamRes] = await Promise.all([
      fetch(`/api/tasks?loanId=${loanId}`),
      fetch('/api/team'),
    ])
    setTasks(await tasksRes.json())
    const teamData = await teamRes.json()
    setTeam(teamData?.members ?? teamData ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [loanId])

  async function handleAdd() {
    if (!title.trim()) return
    setSaving(true)
    const member = team.find(m => m.user_id === assignedId)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loan_id: loanId, client_id: clientId,
        title, description,
        assigned_to_user_id: assignedId || null,
        assigned_to_name: member?.full_name || assignedName || null,
        due_date: dueDate || null, priority,
      }),
    })
    setTitle(''); setDescription(''); setAssignedId(''); setAssignedName(''); setDueDate(''); setPriority('normal')
    setSaving(false)
    setAdding(false)
    load()
  }

  async function toggleStatus(task: Task) {
    const newStatus = task.status === 'done' ? 'open' : 'done'
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    load()
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    load()
  }

  const open = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const done = tasks.filter(t => t.status === 'done')

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">Tasks</h3>
          {open.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{open.length} open</span>
          )}
        </div>
        <button onClick={() => setAdding(v => !v)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
          {adding ? 'Cancel' : '+ Add Task'}
        </button>
      </div>

      {adding && (
        <div className="space-y-3 bg-gray-50 rounded-xl p-4">
          <input
            placeholder="Task title *"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={assignedId}
              onChange={e => setAssignedId(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Assign to…</option>
              {team.map((m: TeamMember) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
              ))}
            </select>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !title.trim()}
            className="w-full bg-blue-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-400">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-sm text-gray-400">No tasks yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {open.map(task => (
            <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 group">
              <button
                onClick={() => toggleStatus(task)}
                className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 flex-shrink-0 mt-0.5 transition"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-800">{task.title}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_CONFIG[task.priority]?.color}`}>
                    {PRIORITY_CONFIG[task.priority]?.label}
                  </span>
                </div>
                {task.description && <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {task.assigned_to_name && (
                    <span className="text-xs text-gray-400">👤 {task.assigned_to_name}</span>
                  )}
                  {task.due_date && (
                    <span className={`text-xs ${dueDateColor(task.due_date, task.status)}`}>
                      📅 {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition text-sm"
              >
                ✕
              </button>
            </div>
          ))}

          {done.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                {done.length} completed task{done.length !== 1 ? 's' : ''}
              </summary>
              <div className="mt-2 space-y-1.5">
                {done.map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 group opacity-60">
                    <button
                      onClick={() => toggleStatus(task)}
                      className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5"
                    >
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </button>
                    <p className="text-sm text-gray-400 line-through">{task.title}</p>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
