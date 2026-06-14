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

// POST — assign plan to a team or individual user
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id: planId } = await params
  const { team_id, user_id, start_date } = await req.json() as {
    team_id?: number
    user_id?: string
    start_date?: string
  }

  if (!team_id && !user_id) return NextResponse.json({ error: 'team_id or user_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('work_plan_assignments')
    .insert({
      plan_id: Number(planId),
      team_id: team_id ?? null,
      user_id: user_id ?? null,
      start_date: start_date ?? new Date().toISOString().split('T')[0],
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE — remove an assignment
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id: planId } = await params
  const assignment_id = req.nextUrl.searchParams.get('assignment_id')
  if (!assignment_id) return NextResponse.json({ error: 'assignment_id required' }, { status: 400 })

  await supabaseAdmin.from('work_plan_assignments').delete().eq('id', assignment_id).eq('plan_id', planId)
  return NextResponse.json({ ok: true })
}
