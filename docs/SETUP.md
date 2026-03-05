## Sentry Setup

1. Go to https://sentry.io and create a new project (platform: Next.js)
2. Copy the DSN from Project Settings → Client Keys
3. Add to Vercel environment variables:
   - `NEXT_PUBLIC_SENTRY_DSN` = your DSN
   - `SENTRY_ORG` = your org slug
   - `SENTRY_PROJECT` = wirechase
   - `SENTRY_AUTH_TOKEN` = from https://sentry.io/settings/auth-tokens/
4. Sentry will automatically capture all unhandled errors and send alerts
