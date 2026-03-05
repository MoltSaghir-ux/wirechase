import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id, full_name').eq('id', user.id).single()
  if (!broker?.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  const { clientId, loanId, topic, details } = await req.json()
  if (!clientId || !topic?.trim()) return NextResponse.json({ error: 'clientId and topic required' }, { status: 400 })

  // Verify ownership
  const { data: client } = await adminSupabase.from('clients').select('brokerage_id, full_name, email, invite_token').eq('id', clientId).single()
  if (!client || client.brokerage_id !== broker.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  // Add a document request for the LOE
  await adminSupabase.from('document_requests').insert({
    client_id: clientId,
    loan_id: loanId ?? null,
    label: `Letter of Explanation — ${topic}`,
    required: true,
    status: 'missing',
    category: 'explanation',
    doc_type: 'loe',
    requested_at: new Date().toISOString(),
  })

  // Send email via Resend
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const uploadLink = `${process.env.NEXT_PUBLIC_APP_URL}/client/upload/${client.invite_token}`

    await resend.emails.send({
      from: 'WireChase <updates@resend.dev>',
      to: process.env.NODE_ENV === 'production' ? client.email : (process.env.RESEND_TEST_EMAIL ?? client.email),
      subject: `Letter of Explanation Requested — ${topic}`,
      html: `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 24px;color:#111;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:28px;">
            <div style="background:#3b82f6;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <span style="color:white;font-weight:bold;font-size:16px;">W</span>
            </div>
            <span style="font-weight:bold;font-size:18px;">WireChase</span>
          </div>
          <h2 style="margin:0 0 12px;font-size:20px;">Letter of Explanation Needed</h2>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
            Hi ${client.full_name}, your loan officer has requested a Letter of Explanation (LOE) regarding:
          </p>
          <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
            <strong style="font-size:15px;">${topic}</strong>
            ${details ? `<p style="margin:8px 0 0;color:#78350f;font-size:14px;">${details}</p>` : ''}
          </div>
          <p style="color:#6b7280;font-size:14px;margin-bottom:20px;">
            Please write a brief letter (1–2 paragraphs) explaining the situation and upload it through your document portal.
          </p>
          <a href="${uploadLink}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px;">
            Upload My Letter →
          </a>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;"/>
          <p style="color:#d1d5db;font-size:11px;margin:0;">WireChase · Secure Mortgage Document Collection</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('LOE email failed (non-fatal):', err)
  }

  return NextResponse.json({ success: true })
}
