/**
 * POST /api/work-plans/[id]/enroll-catchup
 * Enroll a specific user in ALL blocks of a plan that are past-due
 * relative to a given start_date. Used for new employees joining
 * a team mid-stream — set start_date to the team's plan start date
 * to catch them up on everything they "should" have done.
 */
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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id: planId } = await params
  const { user_id, start_date } = await req.json() as { user_id: string; start_date: string }

  if (!user_id || !start_date) return NextResponse.json({ error: 'user_id and start_date required' }, { status: 400 })

  const start = new Date(start_date)
  const today = new Date()
  const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / 86_400_000)

  // Fetch all blocks for this plan
  const { data: blocks } = await supabaseAdmin
    .from('work_plan_blocks')
    .select('id, delay_days, work_plan_block_courses(course_id)')
    .eq('plan_id', planId)

  // Only blocks whose delay has elapsed
  const dueBlocks = (blocks ?? []).filter(b => b.delay_days <= daysSinceStart)

  const courseIds = [...new Set(
    dueBlocks.flatMap(b =>
      (b.work_plan_block_courses as { course_id: number }[]).map(c => c.course_id)
    )
  )]

  if (courseIds.length === 0) return NextResponse.json({ enrolled: 0 })

  const enrollments = courseIds.map(course_id => ({
    user_id,
    course_id,
    status: 'not_started' as const,
  }))

  await supabaseAdmin
    .from('enrollments')
    .upsert(enrollments, { onConflict: 'user_id,course_id', ignoreDuplicates: true })

  return NextResponse.json({ enrolled: courseIds.length, blocks_due: dueBlocks.length })
}
