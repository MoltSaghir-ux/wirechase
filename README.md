# WireChase — DocChase

Smart document collection portal for mortgage brokers.

## What It Does
- Brokers invite clients via a secure link
- Clients upload required documents
- Broker dashboard shows exactly what's missing
- Automated alerts for incomplete submissions

## Stack
- **Frontend/Backend:** Next.js 15 (App Router)
- **Database + Auth:** Supabase
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Getting Started

```bash
cp .env.example .env.local
# Fill in your Supabase credentials
npm install
npm run dev
```

## Project Structure
```
src/
  app/
    broker/     ← broker dashboard routes
    client/     ← client upload portal routes
  components/
    ui/         ← shared UI components
docs/           ← decisions, roadmap, notes
```
