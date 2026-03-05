import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'wirechase-admin'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'WIRE-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function getSecret(req: NextRequest, queryFallback?: string | null): string | null {
  // Prefer Authorization header, fall back to query param for backwards compat
  const header = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (header) return header
  return queryFallback ?? null
}

// GET — list all codes
export async function GET(req: NextRequest) {
  const secret = getSecret(req, req.nextUrl.searchParams.get('secret'))
  if (secret !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await adminSupabase
    .from('platform_invite_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to load codes' }, { status: 500 })
  return NextResponse.json({ codes: data })
}

// POST — generate codes
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { secret: bodySecret, count = 1 } = body
  const secret = getSecret(req, bodySecret)
  if (secret !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const codes = Array.from({ length: Math.min(count, 50) }, () => ({ code: generateCode() }))

  const { data, error } = await adminSupabase
    .from('platform_invite_codes')
    .insert(codes)
    .select()

  if (error) return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 })
  return NextResponse.json({ codes: data })
}

// DELETE — revoke an unused code
export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { secret: bodySecret, codeId } = body
  const secret = getSecret(req, bodySecret)
  if (secret !== ADMIN_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!codeId) return NextResponse.json({ error: 'codeId required' }, { status: 400 })

  const { error } = await adminSupabase
    .from('platform_invite_codes')
    .delete()
    .eq('id', codeId)
    .is('used_by', null) // only delete unused codes

  if (error) return NextResponse.json({ error: 'Failed to revoke code' }, { status: 500 })
  return NextResponse.json({ success: true })
}
