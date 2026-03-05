import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  const { data: loan } = await adminSupabase
    .from('loans')
    .select('*')
    .eq('client_id', clientId)
    .eq('broker_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ loan: loan ?? null })
}
