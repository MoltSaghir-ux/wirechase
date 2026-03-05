import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

// Twilio sends form-encoded POST
// SECURITY TODO: Add Twilio request signature validation using X-Twilio-Signature header
// and the twilio.validateRequest() helper to prevent spoofed inbound webhooks.
// See: https://www.twilio.com/docs/usage/webhooks/webhooks-security
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const from = formData.get('From') as string // sender phone number
  const body = formData.get('Body') as string // message content
  const to = formData.get('To') as string     // your Twilio number

  if (!from || !body) {
    return new NextResponse('Missing fields', { status: 400 })
  }

  // Find client by phone number
  const { data: client } = await adminSupabase
    .from('clients')
    .select('id, full_name, brokerage_id')
    .eq('phone', from)
    .maybeSingle()

  if (client) {
    // Log inbound SMS to activity log
    adminSupabase.from('activity_log').insert({
      client_id: client.id,
      action: 'sms_received',
      details: `SMS received from ${client.full_name}: "${body.slice(0, 200)}"`,
    })
    // fire-and-forget

    // Create a notification for the broker
    adminSupabase.from('notifications').insert({
      brokerage_id: client.brokerage_id,
      type: 'sms_reply',
      title: `SMS reply from ${client.full_name}`,
      message: body.slice(0, 200),
      client_id: client.id,
      severity: 'normal',
    })
    // fire-and-forget
  }

  // Return TwiML response (empty = no auto-reply)
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { 'Content-Type': 'text/xml' } }
  )
}
