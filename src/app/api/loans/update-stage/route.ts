import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { logActivity } from '@/lib/activity'

const adminSupabase = createAdminSupabaseClient()

const VALID_STAGES = ['application', 'processing', 'submitted_uw', 'conditional_approval', 'clear_to_close', 'closing', 'funded', 'denied']

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { loanId, stage } = await req.json()
  if (!loanId || !VALID_STAGES.includes(stage)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Verify ownership
  const { data: loan } = await adminSupabase
    .from('loans')
    .select('id, loan_stage, client_id, broker_id')
    .eq('id', loanId)
    .eq('broker_id', user.id)
    .single()

  if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const prevStage = loan.loan_stage

  await adminSupabase
    .from('loans')
    .update({ loan_stage: stage, updated_at: new Date().toISOString() })
    .eq('id', loanId)

  // Log status history
  await adminSupabase.from('loan_status_history').insert({
    loan_id: loanId,
    from_status: prevStage,
    to_status: stage,
    changed_by: 'broker',
  })

  // Log activity on client
  const stageLabels: Record<string, string> = {
    application: 'Application',
    processing: 'Processing',
    submitted_uw: 'Submitted to Underwriting',
    conditional_approval: 'Conditional Approval',
    clear_to_close: 'Clear to Close',
    closing: 'Closing',
    funded: 'Funded 🎉',
    denied: 'Denied',
  }
  await logActivity(loan.client_id, 'stage_changed', `Loan stage updated: ${stageLabels[prevStage] ?? prevStage} → ${stageLabels[stage] ?? stage}`)

  return NextResponse.json({ success: true, stage })
}
