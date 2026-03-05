'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type Notification = {
  type: string
  message: string
  clientId: string
  clientName: string
  severity: 'high' | 'medium'
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setNotifications(d.notifications ?? []))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const high = notifications.filter(n => n.severity === 'high').length
  const count = notifications.length

  const icons: Record<string, string> = {
    rate_lock: '⏰',
    stale_condition: '📋',
    doc_expiring: '📄',
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-white/10 transition"
      >
        <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 text-[10px] font-bold text-white w-4 h-4 rounded-full flex items-center justify-center ${high > 0 ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Notifications</p>
            {count > 0 && <span className="text-xs text-gray-400">{count} item{count !== 1 ? 's' : ''}</span>}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl mb-2">✓</p>
              <p className="text-sm text-gray-400">All clear — nothing urgent</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {notifications.map((n, i) => (
                <Link
                  key={i}
                  href={`/broker/clients/${n.clientId}${n.type === 'stale_condition' ? '?tab=conditions' : ''}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition"
                >
                  <span className="text-base mt-0.5">{icons[n.type] ?? '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 truncate">{n.clientName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  </div>
                  {n.severity === 'high' && (
                    <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">Urgent</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
