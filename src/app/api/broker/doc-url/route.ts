import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminSupabaseClient } from '@/lib/supabase-server'

const adminSupabase = createAdminSupabaseClient()

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const docId = req.nextUrl.searchParams.get('docId')
  if (!docId) return NextResponse.json({ error: 'Missing docId' }, { status: 400 })

  // Verify this document belongs to one of this broker's clients
  const { data: doc } = await supabase
    .from('documents')
    .select(`
      file_path, file_name,
      document_requests (
        client_id,
        clients (broker_id)
      )
    `)
    .eq('id', docId)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const req2 = doc.document_requests as any
  const brokerIdOnDoc = req2?.clients?.broker_id
  if (brokerIdOnDoc !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Generate a signed URL valid for 60 seconds
  const { data, error } = await adminSupabase.storage
    .from('documents')
    .createSignedUrl(doc.file_path, 60)

  if (error || !data) return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl, fileName: doc.file_name })
}
