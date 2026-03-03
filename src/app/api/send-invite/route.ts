import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { clientId } = await req.json()
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  // Fetch client — verify it belongs to this broker
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, email, invite_token')
    .eq('id', clientId)
    .eq('broker_id', user.id)
    .single()

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/client/upload/${client.invite_token}`
  const brokerEmail = user.email ?? 'your mortgage broker'

  const { error } = await resend.emails.send({
    from: 'WireChase <onboarding@resend.dev>',
    to: client.email,
    subject: 'Documents needed for your mortgage application',
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111;">
        <h2 style="margin: 0 0 8px;">Hi ${client.full_name},</h2>
        <p style="color: #555; margin: 0 0 24px;">
          Your mortgage broker (<strong>${brokerEmail}</strong>) has requested documents
          for your mortgage application. Please upload them using the secure link below.
        </p>

        <a href="${inviteLink}"
           style="display: inline-block; background: #2563eb; color: white; text-decoration: none;
                  padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-bottom: 24px;">
          Upload My Documents →
        </a>

        <p style="color: #888; font-size: 13px; margin: 0;">
          This link is unique to you. Do not share it with anyone else.<br/>
          If you have questions, reply directly to your broker.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #bbb; font-size: 12px; margin: 0;">Powered by WireChase</p>
      </div>
    `,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
