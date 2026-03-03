import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ userId: data.user.id })
}
