import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function logActivity(clientId: string, event: string, detail?: string) {
  try {
    await adminSupabase.from('activity_log').insert({ client_id: clientId, event, detail: detail?.slice(0, 500) ?? null })
  } catch (e) {
    console.error('Activity log failed:', e)
  }
}
