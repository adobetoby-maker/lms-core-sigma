/**
 * Cron: weekly overdue alert
 * Fires every Monday — sends escalated alert for groups past their due date.
 * Also sends a direct reminder to each overdue learner.
 * Vercel cron: schedule = "0 10 * * 1"  (Monday 10am UTC)
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()

  // Groups that are past due
  const { data: groups } = await supabaseAdmin
    .from('course_groups')
    .select(`
      id, name, due_at, notify_email, notify_name,
      course_group_courses(course_id),
      course_group_members(user_email, user_id)
    `)
    .lt('due_at', now)
    .not('due_at', 'is', null)

  if (!groups?.length) return NextResponse.json({ ok: true, sent: 0 })

  let sent = 0

  for (const group of groups) {
    const courseIds = (group.course_group_courses as { course_id: number }[]).map(c => c.course_id)
    const members   = group.course_group_members as { user_email: string; user_id: string | null }[]
    const dueStr    = new Date(group.due_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const overdue: string[] = []
    for (const member of members) {
      if (!member.user_id) { overdue.push(member.user_email); continue }
      const { data: enrollments } = await supabaseAdmin
        .from('enrollments').select('status')
        .eq('user_id', member.user_id).in('course_id', courseIds)
      const allPassed = (enrollments ?? []).length === courseIds.length &&
        (enrollments ?? []).every(e => e.status === 'passed')
      if (!allPassed) overdue.push(member.user_email)
    }

    if (!overdue.length) continue

    // Alert the compliance contact
    if (group.notify_email) {
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? 'noreply@worker-bee.app',
        to: group.notify_email,
        subject: `⚠️ OVERDUE: ${group.name} compliance training`,
        html: `
          <h2 style="color:#ef4444">Overdue Compliance Alert</h2>
          <p>Hi ${group.notify_name ?? 'there'},</p>
          <p>The following employees have <strong>not completed</strong> <strong>${group.name}</strong> which was due on <strong style="color:#ef4444">${dueStr}</strong>:</p>
          <ul>${overdue.map(e => `<li style="color:#ef4444">${e}</li>`).join('')}</ul>
          <p>Please follow up with these employees immediately to ensure compliance.</p>
          <p style="color:#6b7280;font-size:12px">This is an automated overdue alert from your LMS compliance tracker.</p>
        `,
      }).catch(() => {})
    }

    // Also nudge each overdue learner directly
    for (const email of overdue) {
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? 'noreply@worker-bee.app',
        to: email,
        subject: `Action required: Complete your compliance training`,
        html: `
          <h2>Your compliance training is overdue</h2>
          <p>Your <strong>${group.name}</strong> training was due on <strong>${dueStr}</strong>.</p>
          <p>Please log in and complete your courses as soon as possible.</p>
          <p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/dashboard" style="background:#ef4444;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Complete Training Now</a></p>
        `,
      }).catch(() => {})
    }

    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
