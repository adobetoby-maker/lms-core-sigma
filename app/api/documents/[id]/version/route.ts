import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  const notes = form.get('notes') as string | null

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const { data: current } = await supabaseAdmin
    .from('documents').select('id, version').eq('id', id).single()
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const newVersion = ((current as { version: number }).version ?? 1) + 1
  const filePath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const bytes = await file.arrayBuffer()
  const contentHash = createHash('sha256').update(Buffer.from(bytes)).digest('hex')

  const { error: uploadError } = await supabaseAdmin.storage
    .from('documents')
    .upload(filePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { error: updateError } = await supabaseAdmin
    .from('documents')
    .update({ file_path: filePath, file_name: file.name, file_size: file.size, content_hash: contentHash, version: newVersion })
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { error: versionError } = await supabaseAdmin
    .from('document_versions')
    .insert({ document_id: id, version: newVersion, file_path: filePath, file_name: file.name, file_size: file.size, content_hash: contentHash, uploaded_by: user.id, notes: notes ?? null })

  if (versionError) return NextResponse.json({ error: versionError.message }, { status: 500 })

  return NextResponse.json({ ok: true, version: newVersion })
}
