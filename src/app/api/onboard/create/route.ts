import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyName, nmls } = await req.json()
  if (!companyName?.trim()) return NextResponse.json({ error: 'Company name required' }, { status: 400 })

  // Create brokerage
  const { data: brokerage, error } = await adminSupabase
    .from('brokerages')
    .insert({ name: companyName.trim().slice(0, 100), nmls: nmls?.trim().slice(0, 20) ?? null })
    .select()
    .single()

  if (error || !brokerage) return NextResponse.json({ error: 'Failed to create brokerage' }, { status: 500 })

  // Upsert broker as admin
  await adminSupabase.from('brokers').upsert({
    id: user.id,
    email: user.email ?? '',
    full_name: user.email?.split('@')[0] ?? 'Admin',
    brokerage_id: brokerage.id,
    role: 'admin',
  }, { onConflict: 'id' })

  return NextResponse.json({ success: true, brokerageId: brokerage.id })
}
