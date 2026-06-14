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

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabaseAdmin
    .from('work_plans')
    .select('id, name, description, created_at, work_plan_blocks(count), work_plan_assignments(count)')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const shaped = (data ?? []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    created_at: p.created_at,
    block_count:      (p.work_plan_blocks as unknown as { count: number }[])[0]?.count ?? 0,
    assignment_count: (p.work_plan_assignments as unknown as { count: number }[])[0]?.count ?? 0,
  }))

  return NextResponse.json(shaped)
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, description } = await req.json() as { name: string; description?: string }
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('work_plans')
    .insert({ name: name.trim(), description: description?.trim() || null })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
