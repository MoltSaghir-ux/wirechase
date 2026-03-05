import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id').eq('id', user.id).single()
  if (!broker?.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  const { data: task } = await adminSupabase.from('loan_tasks').select('brokerage_id').eq('id', id).single()
  if (!task || task.brokerage_id !== broker.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  const body = await req.json()
  const { title, description, assigned_to_user_id, assigned_to_name, due_date, priority, status } = body

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (assigned_to_user_id !== undefined) updates.assigned_to_user_id = assigned_to_user_id
  if (assigned_to_name !== undefined) updates.assigned_to_name = assigned_to_name
  if (due_date !== undefined) updates.due_date = due_date
  if (priority !== undefined) updates.priority = priority
  if (status !== undefined) updates.status = status

  const { data, error } = await adminSupabase.from('loan_tasks').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: broker } = await adminSupabase.from('brokers').select('brokerage_id').eq('id', user.id).single()
  if (!broker?.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  const { data: task } = await adminSupabase.from('loan_tasks').select('brokerage_id').eq('id', id).single()
  if (!task || task.brokerage_id !== broker.brokerage_id) return new NextResponse('Forbidden', { status: 403 })

  await adminSupabase.from('loan_tasks').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
