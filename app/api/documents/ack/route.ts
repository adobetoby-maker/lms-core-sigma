import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { document_id } = await req.json() as { document_id: string }
  if (!document_id) return NextResponse.json({ error: 'document_id required' }, { status: 400 })

  const { data: doc } = await supabaseAdmin
    .from('documents').select('version, content_hash').eq('id', document_id).single()

  await supabaseAdmin.from('document_acks').upsert(
    {
      document_id,
      user_id: user.id,
      acked_at: new Date().toISOString(),
      document_version: (doc as { version: number } | null)?.version ?? null,
      content_hash: (doc as { content_hash: string } | null)?.content_hash ?? null,
    },
    { onConflict: 'document_id,user_id' }
  )

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: requiredDocs }, { data: allProfiles }, { data: allAcks }] = await Promise.all([
    supabaseAdmin.from('documents').select('id, title, category, version').eq('requires_ack', true),
    supabaseAdmin.from('profiles').select('id, first_name, last_name'),
    supabaseAdmin.from('document_acks').select('document_id, user_id, acked_at, document_version'),
  ])

  const ackMap = new Map<string, { acked_at: string; document_version: number | null }>()
  for (const ack of allAcks ?? []) {
    const a = ack as { document_id: string; user_id: string; acked_at: string; document_version: number | null }
    ackMap.set(`${a.document_id}:${a.user_id}`, { acked_at: a.acked_at, document_version: a.document_version })
  }

  const report = (requiredDocs ?? []).map((doc: { id: string; title: string; category: string; version: number }) => {
    const staffStatus = (allProfiles ?? []).map((p: { id: string; first_name: string; last_name: string }) => {
      const ackData = ackMap.get(`${doc.id}:${p.id}`) ?? null
      return {
        name: `${p.first_name} ${p.last_name}`.trim(),
        acknowledged: !!ackData,
        acked_at: ackData?.acked_at ?? null,
        document_version: ackData?.document_version ?? null,
      }
    })
    const ackedCount = staffStatus.filter((s: { acknowledged: boolean }) => s.acknowledged).length
    return {
      document: doc,
      total_staff: staffStatus.length,
      acked: ackedCount,
      pending: staffStatus.length - ackedCount,
      completion_pct: staffStatus.length > 0 ? Math.round((ackedCount / staffStatus.length) * 100) : 0,
      staff: staffStatus,
    }
  })

  return NextResponse.json({ report })
}
