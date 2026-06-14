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

// POST — add a block to the plan
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id: planId } = await params
  const { name, delay_days } = await req.json() as { name: string; delay_days: number }

  // sort_order = max existing + 1
  const { data: existing } = await supabaseAdmin
    .from('work_plan_blocks').select('sort_order').eq('plan_id', planId).order('sort_order', { ascending: false }).limit(1)
  const sort_order = ((existing?.[0]?.sort_order as number) ?? -1) + 1

  const { data, error } = await supabaseAdmin
    .from('work_plan_blocks')
    .insert({ plan_id: Number(planId), name: name.trim(), delay_days: Number(delay_days), sort_order })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
