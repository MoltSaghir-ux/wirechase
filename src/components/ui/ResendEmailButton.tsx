'use client'

import { useState } from 'react'

export default function ResendEmailButton({ clientId }: { clientId: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleResend() {
    setStatus('sending')
    const res = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
    setStatus(res.ok ? 'sent' : 'error')
    if (res.ok) setTimeout(() => setStatus('idle'), 3000)
  }

  return (
    <button
      onClick={handleResend}
      disabled={status === 'sending'}
      className="text-sm bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
    >
      {status === 'idle' && '📧 Resend Invite Email'}
      {status === 'sending' && 'Sending...'}
      {status === 'sent' && '✓ Email Sent!'}
      {status === 'error' && '✗ Failed — Try Again'}
    </button>
  )
}
