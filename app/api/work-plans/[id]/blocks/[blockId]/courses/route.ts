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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; blockId: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { blockId } = await params
  const { course_id } = await req.json() as { course_id: number }

  const { data: existing } = await supabaseAdmin
    .from('work_plan_block_courses').select('sort_order').eq('block_id', blockId).order('sort_order', { ascending: false }).limit(1)
  const sort_order = ((existing?.[0]?.sort_order as number) ?? -1) + 1

  const { error } = await supabaseAdmin
    .from('work_plan_block_courses')
    .insert({ block_id: Number(blockId), course_id: Number(course_id), sort_order })

  if (error && error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; blockId: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { blockId } = await params
  const course_id = req.nextUrl.searchParams.get('course_id')
  if (!course_id) return NextResponse.json({ error: 'course_id required' }, { status: 400 })

  await supabaseAdmin.from('work_plan_block_courses').delete().eq('block_id', blockId).eq('course_id', course_id)
  return NextResponse.json({ ok: true })
}
