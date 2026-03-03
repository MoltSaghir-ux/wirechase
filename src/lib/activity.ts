import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function logActivity(clientId: string, event: string, detail?: string) {
  try {
    await adminSupabase.from('activity_log').insert({ client_id: clientId, event, detail: detail?.slice(0, 500) ?? null })
  } catch (e) {
    console.error('Activity log failed:', e)
  }
}
