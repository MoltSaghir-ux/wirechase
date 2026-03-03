import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get broker's brokerage and role — null if not set up yet
export async function getBrokerContext(userId: string) {
  const { data } = await adminSupabase
    .from('brokers')
    .select('id, full_name, email, role, brokerage_id, brokerages (id, name, nmls)')
    .eq('id', userId)
    .single()
  return data
}

// Create a new brokerage and set this broker as admin
export async function createBrokerage(userId: string, userEmail: string, name: string, nmls: string) {
  const { data: brokerage, error } = await adminSupabase
    .from('brokerages')
    .insert({ name: name.trim().slice(0, 100), nmls: nmls.trim().slice(0, 20) })
    .select()
    .single()

  if (error || !brokerage) throw new Error('Failed to create brokerage')

  await adminSupabase.from('brokers').upsert({
    id: userId,
    email: userEmail,
    full_name: userEmail.split('@')[0],
    brokerage_id: brokerage.id,
    role: 'admin',
  }, { onConflict: 'id' })

  return brokerage
}
