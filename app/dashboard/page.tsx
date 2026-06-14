import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import { DashboardClient } from '@/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, is_admin')
    .eq('id', user.id)
    .single()

  if (profile?.is_admin) redirect('/admin')

  const [enrollmentsRes, attemptsRes] = await Promise.all([
    supabase
      .from('enrollments')
      .select(`id, status, video_watched, completed_at, courses(id, title, description, is_active)`)
      .eq('user_id', user.id)
      .order('invited_at', { ascending: false }),
    supabase
      .from('quiz_attempts')
      .select('course_id, score, passed')
      .eq('user_id', user.id)
      .order('attempted_at', { ascending: false }),
  ])

  const enrollments = (enrollmentsRes.data ?? []).map(e => ({
    ...e,
    courses: Array.isArray(e.courses) ? e.courses[0] : e.courses,
  })) as Parameters<typeof DashboardClient>[0]['enrollments']

  const attempts = attemptsRes.data ?? []
  const firstName = profile?.first_name?.trim() || 'there'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <DashboardClient firstName={firstName} enrollments={enrollments} attempts={attempts} />
    </div>
  )
}
