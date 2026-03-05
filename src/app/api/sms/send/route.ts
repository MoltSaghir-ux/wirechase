import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { sendSMS, isTwilioConfigured } from '@/lib/twilio'

const adminSupabase = createAdminSupabaseClient()

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id').eq('id', user.id).single()
  if (!broker?.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  const { clientId, message } = await req.json()
  if (!clientId || !message?.trim()) {
    return NextResponse.json({ error: 'clientId and message required' }, { status: 400 })
  }

  // Verify client belongs to broker's brokerage
  const { data: client } = await adminSupabase
    .from('clients')
    .select('id, full_name, phone, brokerage_id')
    .eq('id', clientId)
    .single()

  if (!client || client.brokerage_id !== broker.brokerage_id) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  if (!client.phone) {
    return NextResponse.json({ error: 'Client has no phone number on file' }, { status: 400 })
  }

  if (!isTwilioConfigured()) {
    return NextResponse.json({ error: 'SMS not configured — add Twilio credentials to enable' }, { status: 503 })
  }

  const result = await sendSMS(client.phone, message)

  if (result.success) {
    // Log to activity
    adminSupabase.from('activity_log').insert({
      client_id: clientId,
      broker_id: user.id,
      action: 'sms_sent',
      details: `SMS sent: "${message.slice(0, 80)}${message.length > 80 ? '…' : ''}"`,
    })
    // fire-and-forget // non-fatal, fire-and-forget

    return NextResponse.json({ success: true })
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
}
