'use client'
import { useState } from 'react'

const QUICK_MESSAGES = [
  'Hi {name}, this is your loan officer. Just checking in — do you have any questions about your loan?',
  'Hi {name}, we are still waiting on a few documents. Please upload them through your portal when you get a chance.',
  'Hi {name}, great news! Your loan has moved to the next stage. I will be in touch shortly with more details.',
  'Hi {name}, please give me a call when you have a moment. I have an update on your loan.',
]

export default function SMSButton({
  clientId,
  clientName,
  clientPhone,
  twilioConfigured,
}: {
  clientId: string
  clientName: string
  clientPhone?: string | null
  twilioConfigured: boolean
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  function applyQuick(template: string) {
    setMessage(template.replace('{name}', clientName.split(' ')[0]))
  }

  async function handleSend() {
    if (!message.trim()) return
    setSending(true)
    setError('')
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, message }),
    })
    const data = await res.json()
    if (res.ok) {
      setSent(true)
      setTimeout(() => { setOpen(false); setSent(false); setMessage('') }, 1500)
    } else {
      setError(data.error ?? 'Failed to send')
    }
    setSending(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={!twilioConfigured || !clientPhone}
        title={!clientPhone ? 'No phone number on file' : !twilioConfigured ? 'SMS not configured' : 'Send SMS'}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/>
        </svg>
        Send SMS
      </button>
    )
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-green-800">Send SMS to {clientName.split(' ')[0]}</p>
        <button onClick={() => setOpen(false)} className="text-green-400 hover:text-green-600 text-lg leading-none">×</button>
      </div>

      {/* Quick messages */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Quick Messages</p>
        {QUICK_MESSAGES.map((m, i) => (
          <button key={i} onClick={() => applyQuick(m)}
            className="w-full text-left text-xs text-green-700 bg-white border border-green-100 rounded-lg px-3 py-2 hover:bg-green-50 transition truncate">
            {m.replace('{name}', clientName.split(' ')[0])}
          </button>
        ))}
      </div>

      <textarea
        placeholder="Type your message..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={3}
        className="w-full border border-green-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
      />

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-green-500">To: {clientPhone}</span>
        <span className={`text-[10px] ${message.length > 160 ? 'text-amber-500' : 'text-green-400'}`}>
          {message.length}/160
        </span>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSend} disabled={sending || sent || !message.trim()}
          className={`flex-1 text-sm font-semibold py-2 rounded-xl transition ${sent ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'}`}>
          {sent ? '✓ Sent!' : sending ? 'Sending…' : 'Send Message'}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 text-sm text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl">Cancel</button>
      </div>
    </div>
  )
}
