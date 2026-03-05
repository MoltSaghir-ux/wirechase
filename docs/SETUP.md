## Sentry Setup

1. Go to https://sentry.io and create a new project (platform: Next.js)
2. Copy the DSN from Project Settings → Client Keys
3. Add to Vercel environment variables:
   - `NEXT_PUBLIC_SENTRY_DSN` = your DSN
   - `SENTRY_ORG` = your org slug
   - `SENTRY_PROJECT` = wirechase
   - `SENTRY_AUTH_TOKEN` = from https://sentry.io/settings/auth-tokens/
4. Sentry will automatically capture all unhandled errors and send alerts

## Twilio SMS Setup

1. Go to https://twilio.com and create an account
2. Get a phone number (US: ~$1/month)
3. Add to Vercel environment variables:
   - `TWILIO_ACCOUNT_SID` = from Twilio console dashboard
   - `TWILIO_AUTH_TOKEN` = from Twilio console dashboard
   - `TWILIO_PHONE_NUMBER` = your Twilio number in E.164 format (+1xxxxxxxxxx)
4. Set up inbound webhook:
   - In Twilio console → Phone Numbers → your number → Messaging
   - Set webhook URL to: `https://wirechase.vercel.app/api/sms/webhook`
   - Method: HTTP POST
5. SMS is live — the Send SMS button appears on client detail pages
