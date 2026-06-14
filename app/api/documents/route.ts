import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('id, title, description, category, file_name, file_size, requires_ack, created_at')
    .order('category')
    .order('title')

  const { data: acks } = await supabaseAdmin
    .from('document_acks')
    .select('document_id')
    .eq('user_id', user.id)

  const ackedIds = new Set((acks ?? []).map((a: { document_id: string }) => a.document_id))

  const documents = (docs ?? []).map((d: Record<string, unknown>) => ({
    ...d,
    acknowledged: ackedIds.has(d.id as string),
  }))

  return NextResponse.json({ documents })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const title = form.get('title') as string
  const description = form.get('description') as string | null
  const category = (form.get('category') as string) || 'General'
  const requiresAck = form.get('requires_ack') === 'true'

  if (!file || !title) return NextResponse.json({ error: 'file and title required' }, { status: 400 })

  const filePath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabaseAdmin.storage
    .from('documents')
    .upload(filePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: doc, error: dbError } = await supabaseAdmin
    .from('documents')
    .insert({ title, description, category, file_path: filePath, file_name: file.name, file_size: file.size, requires_ack: requiresAck, uploaded_by: user.id })
    .select('id')
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: doc.id })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json() as { id: string }
  const { data: doc } = await supabaseAdmin.from('documents').select('file_path').eq('id', id).single()
  if (doc) await supabaseAdmin.storage.from('documents').remove([doc.file_path])
  await supabaseAdmin.from('documents').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
