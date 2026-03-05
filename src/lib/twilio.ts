// Gracefully no-ops if Twilio env vars are not set

export function isTwilioConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  )
}

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  if (!isTwilioConfigured()) {
    console.log('[SMS] Twilio not configured — skipping SMS to', to)
    return { success: false, error: 'Twilio not configured' }
  }

  try {
    const twilio = require('twilio')
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    })
    return { success: true }
  } catch (err: any) {
    console.error('[SMS] Failed to send:', err.message)
    return { success: false, error: err.message }
  }
}
