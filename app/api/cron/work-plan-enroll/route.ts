/**
 * Cron: daily work-plan enrollment
 * Runs every day at 8am UTC.
 * For each active work_plan_assignment, checks which blocks are now due
 * (start_date + delay_days <= today) and enrolls the affected users.
 * Idempotent — duplicate enrollments are ignored.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  // All assignments with their plan blocks and courses
  const { data: assignments } = await supabaseAdmin
    .from('work_plan_assignments')
    .select(`
      id, team_id, user_id, start_date, plan_id,
      work_plans:plan_id(
        work_plan_blocks(id, delay_days, work_plan_block_courses(course_id))
      )
    `)

  let totalEnrolled = 0

  for (const assignment of assignments ?? []) {
    const startDate = new Date(assignment.start_date)
    const msPerDay = 86_400_000
    const daysSinceStart = Math.floor((new Date(today).getTime() - startDate.getTime()) / msPerDay)

    const plan = assignment.work_plans as unknown as {
      work_plan_blocks: { id: number; delay_days: number; work_plan_block_courses: { course_id: number }[] }[]
    }

    const dueBlocks = (plan?.work_plan_blocks ?? []).filter(b => b.delay_days <= daysSinceStart)
    const courseIds = [...new Set(dueBlocks.flatMap(b => b.work_plan_block_courses.map(c => c.course_id)))]
    if (!courseIds.length) continue

    // Resolve user IDs — direct or via team
    let userIds: string[] = []
    if (assignment.user_id) {
      userIds = [assignment.user_id]
    } else if (assignment.team_id) {
      const { data: members } = await supabaseAdmin
        .from('team_members').select('user_id').eq('team_id', assignment.team_id)
      userIds = (members ?? []).map(m => m.user_id as string)
    }

    if (!userIds.length) continue

    const enrollments = userIds.flatMap(user_id =>
      courseIds.map(course_id => ({ user_id, course_id, status: 'not_started' as const }))
    )

    await supabaseAdmin
      .from('enrollments')
      .upsert(enrollments, { onConflict: 'user_id,course_id', ignoreDuplicates: true })

    totalEnrolled += enrollments.length
  }

  return NextResponse.json({ ok: true, processed: assignments?.length ?? 0, enrolled: totalEnrolled })
}
