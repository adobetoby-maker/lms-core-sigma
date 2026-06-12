import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const {
    name, description, publish_at, due_at,
    notify_email, notify_name,
    course_ids, learner_emails,
  } = await req.json()

  if (!name || !course_ids?.length) {
    return NextResponse.json({ error: 'name and course_ids are required' }, { status: 400 })
  }

  // Create the group
  const { data: group, error: gErr } = await supabaseAdmin
    .from('course_groups')
    .insert({ name, description, publish_at, due_at, notify_email, notify_name })
    .select().single()

  if (gErr || !group) return NextResponse.json({ error: gErr?.message ?? 'Failed' }, { status: 500 })

  // Link courses
  await supabaseAdmin.from('course_group_courses').insert(
    course_ids.map((cid: number) => ({ group_id: group.id, course_id: cid }))
  )

  // Register members
  const emails: string[] = (learner_emails ?? []).filter(Boolean)
  if (emails.length) {
    // Try to resolve existing user IDs
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email:id')  // profiles don't store email directly — use auth

    // Get emails from auth
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
    const emailToId = Object.fromEntries(authUsers.map(u => [u.email?.toLowerCase() ?? '', u.id]))

    await supabaseAdmin.from('course_group_members').insert(
      emails.map(email => ({
        group_id: group.id,
        user_email: email.toLowerCase(),
        user_id: emailToId[email.toLowerCase()] ?? null,
        enrolled: false,
      }))
    )

    // If publish_at is null/past → enroll now
    const shouldEnrollNow = !publish_at || new Date(publish_at) <= new Date()
    if (shouldEnrollNow) {
      await enrollGroupMembers(group.id, course_ids, emails, due_at)
    }
  }

  return NextResponse.json({ ok: true, group_id: group.id })
}

export async function enrollGroupMembers(
  groupId: string,
  courseIds: number[],
  emails: string[],
  dueAt?: string | null,
) {
  const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
  const emailToId = Object.fromEntries(authUsers.map(u => [u.email?.toLowerCase() ?? '', u.id]))

  for (const email of emails) {
    const userId = emailToId[email.toLowerCase()]
    if (!userId) {
      // Send invite for each course
      for (const courseId of courseIds) {
        const token = crypto.randomUUID()
        const expiresAt = dueAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        await supabaseAdmin.from('invites').insert({
          email, course_id: courseId, token,
          status: 'pending', expires_at: expiresAt,
        })
        const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/register/${token}`
        await resend.emails.send({
          from: process.env.RESEND_FROM ?? 'noreply@worker-bee.app',
          to: email,
          subject: 'You have been enrolled in a compliance training course',
          html: `<p>You've been enrolled in compliance training. <a href="${inviteUrl}">Click here to get started</a>.</p>${dueAt ? `<p>Due date: ${new Date(dueAt).toLocaleDateString()}</p>` : ''}`,
        }).catch(() => {})
      }
    } else {
      // Enroll existing user
      for (const courseId of courseIds) {
        await supabaseAdmin.from('enrollments').upsert(
          { user_id: userId, course_id: courseId, status: 'invited' },
          { onConflict: 'user_id,course_id', ignoreDuplicates: true }
        )
      }
    }

    // Mark as enrolled
    await supabaseAdmin.from('course_group_members')
      .update({ enrolled: true, user_id: userId ?? null })
      .eq('group_id', groupId).eq('user_email', email.toLowerCase())
  }
}
