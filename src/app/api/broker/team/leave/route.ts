import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await adminSupabase
    .from('brokers')
    .update({ brokerage_id: null, role: 'admin' })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}
