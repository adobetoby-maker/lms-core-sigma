import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: rows, error } = await supabaseAdmin
    .from('document_versions')
    .select('id, version, file_name, file_size, content_hash, uploaded_at, notes, uploaded_by')
    .eq('document_id', id)
    .order('version', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const uploaderIds = [...new Set((rows ?? []).map((r: { uploaded_by: string | null }) => r.uploaded_by).filter(Boolean))] as string[]

  const { data: uploaders } = uploaderIds.length > 0
    ? await supabaseAdmin.from('profiles').select('id, first_name, last_name, email').in('id', uploaderIds)
    : { data: [] }

  const uploaderMap = new Map((uploaders ?? []).map((p: { id: string; first_name: string; last_name: string; email: string }) => [p.id, p]))

  const { data: acks } = await supabaseAdmin
    .from('document_acks')
    .select('document_version')
    .eq('document_id', id)

  const ackCountByVersion = new Map<number, number>()
  for (const ack of acks ?? []) {
    const v = (ack as { document_version: number | null }).document_version
    if (v !== null && v !== undefined) {
      ackCountByVersion.set(v, (ackCountByVersion.get(v) ?? 0) + 1)
    }
  }

  const versions = (rows ?? []).map((r: { id: string; version: number; file_name: string; file_size: number | null; content_hash: string | null; uploaded_at: string; notes: string | null; uploaded_by: string | null }) => {
    const uploader = r.uploaded_by ? uploaderMap.get(r.uploaded_by) ?? null : null
    return {
      id: r.id,
      version: r.version,
      file_name: r.file_name,
      file_size: r.file_size,
      content_hash: r.content_hash,
      uploaded_at: r.uploaded_at,
      notes: r.notes,
      uploader: uploader ? { first_name: uploader.first_name, last_name: uploader.last_name, email: uploader.email } : null,
      ack_count: ackCountByVersion.get(r.version) ?? 0,
    }
  })

  return NextResponse.json({ versions })
}
