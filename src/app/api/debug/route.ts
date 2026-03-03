import { NextResponse } from 'next/server'

export async function GET() {
  // Test if Vercel can reach Supabase at all
  let supabaseReach = 'unknown'
  let supabaseError = ''
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }
    })
    supabaseReach = `${res.status}`
  } catch (e: any) {
    supabaseReach = 'FAILED'
    supabaseError = e?.message ?? String(e)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return NextResponse.json({
    supabaseUrlFull: url,
    supabaseAnonFirst20: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').slice(0, 20),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'MISSING',
    supabaseReach,
    supabaseError,
  })
}
