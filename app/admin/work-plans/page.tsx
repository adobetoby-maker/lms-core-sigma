import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import WorkPlansClient from './WorkPlansClient'

export const metadata = { title: 'Work Plans — LMS Admin' }

export default async function WorkPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/dashboard')

  const { data: plansRaw } = await supabaseAdmin
    .from('work_plans')
    .select('id, name, description, created_at, work_plan_blocks(count), work_plan_assignments(count)')
    .order('name')

  const plans = (plansRaw ?? []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    created_at: p.created_at,
    block_count:      (p.work_plan_blocks as unknown as { count: number }[])[0]?.count ?? 0,
    assignment_count: (p.work_plan_assignments as unknown as { count: number }[])[0]?.count ?? 0,
  }))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <div className="mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm mb-5 transition-colors"
            style={{ color: 'var(--text2)' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Admin
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-1"
              style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
              <CalendarDays className="w-6 h-6" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>Work Plans</h1>
              <p className="mt-1" style={{ color: 'var(--text2)' }}>
                Schedule phased course curricula — onboarding, 3-month reviews, annual refreshers.
              </p>
            </div>
          </div>
        </div>
        <WorkPlansClient plans={plans} />
      </main>
    </div>
  )
}
