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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params

  const [{ data: plan }, { data: blocks }, { data: assignments }] = await Promise.all([
    supabaseAdmin.from('work_plans').select('*').eq('id', id).single(),
    supabaseAdmin.from('work_plan_blocks')
      .select('*, work_plan_block_courses(id, course_id, sort_order, courses:course_id(id, title, is_active))')
      .eq('plan_id', id).order('sort_order'),
    supabaseAdmin.from('work_plan_assignments')
      .select('*, teams:team_id(id, name)')
      .eq('plan_id', id).order('created_at'),
  ])

  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ plan, blocks: blocks ?? [], assignments: assignments ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { name, description } = await req.json() as { name?: string; description?: string }

  const { data, error } = await supabaseAdmin
    .from('work_plans').update({ name, description }).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  await supabaseAdmin.from('work_plans').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
