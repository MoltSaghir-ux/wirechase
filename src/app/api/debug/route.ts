import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'MISSING',
  })
}
