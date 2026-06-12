import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  return profile?.is_admin ? user : null
}

// Archive / unarchive (soft-hide from learners)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const courseId = Number(id)
  if (isNaN(courseId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await req.json()
  const { is_active } = body  // false = archive, true = restore

  const { error } = await supabaseAdmin
    .from('courses')
    .update({ is_active })
    .eq('id', courseId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Hard delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const courseId = Number(id)
  if (isNaN(courseId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  await supabaseAdmin.from('quiz_attempts').delete().eq('course_id', courseId)
  await supabaseAdmin.from('invites').delete().eq('course_id', courseId)
  await supabaseAdmin.from('enrollments').delete().eq('course_id', courseId)
  await supabaseAdmin.from('questions').delete().eq('course_id', courseId)
  await supabaseAdmin.from('videos').delete().eq('course_id', courseId)
  const { error } = await supabaseAdmin.from('courses').delete().eq('id', courseId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
