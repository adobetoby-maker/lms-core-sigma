import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import WorkPlanEditor from './WorkPlanEditor'

export const dynamic = 'force-dynamic'

export default async function WorkPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const [{ data: plan }, { data: blocks }, { data: assignments }, { data: allCourses }, { data: allTeams }] = await Promise.all([
    supabaseAdmin.from('work_plans').select('*').eq('id', id).single(),
    supabaseAdmin.from('work_plan_blocks')
      .select('*, work_plan_block_courses(id, course_id, sort_order, courses:course_id(id, title, is_active))')
      .eq('plan_id', id).order('sort_order'),
    supabaseAdmin.from('work_plan_assignments')
      .select('*, teams:team_id(id, name)')
      .eq('plan_id', id).order('created_at'),
    supabaseAdmin.from('courses').select('id, title, is_active').eq('is_active', true).order('title'),
    supabaseAdmin.from('teams').select('id, name').order('name'),
  ])

  if (!plan) notFound()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <Link href="/admin/work-plans" className="inline-flex items-center gap-2 text-sm mb-6 transition-colors"
          style={{ color: 'var(--text2)' }}>
          <ArrowLeft className="w-4 h-4" /> All Work Plans
        </Link>

        <WorkPlanEditor
          plan={plan}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          blocks={(blocks ?? []) as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          assignments={(assignments ?? []) as any}
          allCourses={allCourses ?? []}
          allTeams={allTeams ?? []}
        />
      </main>
    </div>
  )
}
