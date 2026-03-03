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

  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'MISSING',
    supabaseReach,
    supabaseError,
  })
}
