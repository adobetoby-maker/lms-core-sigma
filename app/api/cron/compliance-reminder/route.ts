/**
 * Cron: weekly compliance reminder
 * Fires every Monday — sends email to notify_email for each group
 * with a list of learners who haven't completed their courses.
 * Vercel cron: schedule = "0 9 * * 1"  (Monday 9am UTC)
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Secure with CRON_SECRET env var
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all active groups that have a notify_email
  const { data: groups } = await supabaseAdmin
    .from('course_groups')
    .select(`
      id, name, due_at, notify_email, notify_name,
      course_group_courses(course_id),
      course_group_members(user_email, user_id, enrolled)
    `)
    .not('notify_email', 'is', null)

  if (!groups?.length) return NextResponse.json({ ok: true, sent: 0 })

  let sent = 0

  for (const group of groups) {
    const courseIds = (group.course_group_courses as { course_id: number }[]).map(c => c.course_id)
    const members   = group.course_group_members as { user_email: string; user_id: string | null }[]

    // Find members who haven't completed all courses
    const incomplete: string[] = []
    for (const member of members) {
      if (!member.user_id) { incomplete.push(member.user_email); continue }
      const { data: enrollments } = await supabaseAdmin
        .from('enrollments')
        .select('status')
        .eq('user_id', member.user_id)
        .in('course_id', courseIds)

      const allPassed = (enrollments ?? []).length === courseIds.length &&
        (enrollments ?? []).every(e => e.status === 'passed')
      if (!allPassed) incomplete.push(member.user_email)
    }

    if (!incomplete.length) continue

    const dueStr = group.due_at ? `Due: ${new Date(group.due_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` : ''

    await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'noreply@worker-bee.app',
      to: group.notify_email,
      subject: `Weekly Compliance Reminder — ${group.name}`,
      html: `
        <h2>Weekly Compliance Training Reminder</h2>
        <p>Hi ${group.notify_name ?? 'there'},</p>
        <p>The following employees have not yet completed <strong>${group.name}</strong>:</p>
        ${dueStr ? `<p style="color:#ef4444"><strong>${dueStr}</strong></p>` : ''}
        <ul>${incomplete.map(e => `<li>${e}</li>`).join('')}</ul>
        <p style="color:#6b7280;font-size:12px">This is an automated weekly reminder from your LMS compliance tracker.</p>
      `,
    }).catch(() => {})

    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
