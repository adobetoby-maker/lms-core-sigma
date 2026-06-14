import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return !!p?.is_admin
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; blockId: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { blockId } = await params
  const body = await req.json() as { name?: string; delay_days?: number; sort_order?: number }

  const { data, error } = await supabaseAdmin
    .from('work_plan_blocks').update(body).eq('id', blockId).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; blockId: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { blockId } = await params
  await supabaseAdmin.from('work_plan_blocks').delete().eq('id', blockId)
  return NextResponse.json({ ok: true })
}
