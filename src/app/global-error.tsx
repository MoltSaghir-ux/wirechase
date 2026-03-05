'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'sans-serif' }}>
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #fee2e2', padding: '32px', maxWidth: 400, textAlign: 'center' }}>
            <h2 style={{ fontWeight: 700, color: '#111', marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 16 }}>{error.message}</p>
            <button onClick={reset} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
