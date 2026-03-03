interface Activity {
  id: string
  event: string
  detail: string | null
  created_at: string
}

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  'client_created': { icon: '👤', color: 'bg-blue-100' },
  'invite_sent': { icon: '📧', color: 'bg-blue-100' },
  'doc_uploaded': { icon: '📄', color: 'bg-green-100' },
  'doc_approved': { icon: '✓', color: 'bg-green-100' },
  'doc_rejected': { icon: '✕', color: 'bg-red-100' },
  'client_complete': { icon: '🎉', color: 'bg-green-100' },
  'note_added': { icon: '📝', color: 'bg-yellow-100' },
  'deadline_set': { icon: '📅', color: 'bg-purple-100' },
  'reminder_sent': { icon: '🔔', color: 'bg-orange-100' },
}

export default function ActivityLog({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
      <p className="text-sm text-gray-400">No activity yet</p>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Activity</h3>
      </div>
      <div className="px-6 py-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />

          <div className="space-y-5">
            {activities.map((a, i) => {
              const meta = EVENT_ICONS[a.event] ?? { icon: '•', color: 'bg-gray-100' }
              return (
                <div key={a.id} className="flex items-start gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 z-10 ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-sm text-gray-800 font-medium">{a.event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    {a.detail && <p className="text-xs text-gray-500 mt-0.5">{a.detail}</p>}
                    <p className="text-xs text-gray-300 mt-1">
                      {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
