import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()

  const baseQuery = supabaseAdmin
    .from('surveys')
    .select('id, title, description, department, is_active, created_at')
    .order('created_at', { ascending: false })

  const { data: surveys } = profile?.is_admin
    ? await baseQuery
    : await baseQuery.eq('is_active', true)

  const [{ data: responses }, { data: questionCounts }] = await Promise.all([
    supabaseAdmin.from('survey_responses').select('survey_id').eq('user_id', user.id),
    supabaseAdmin.from('survey_questions').select('survey_id'),
  ])

  const respondedIds = new Set((responses ?? []).map((r: { survey_id: string }) => r.survey_id))

  const countMap: Record<string, number> = {}
  for (const q of questionCounts ?? []) {
    countMap[q.survey_id] = (countMap[q.survey_id] ?? 0) + 1
  }

  const result = (surveys ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    question_count: countMap[s.id as string] ?? 0,
    completed: respondedIds.has(s.id as string),
  }))

  return NextResponse.json({ surveys: result })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { title, description, department, questions } = await req.json() as {
    title: string
    description?: string
    department?: string
    questions: Array<{ question: string; type: string; options?: string[]; required?: boolean }>
  }

  const { data: survey, error } = await supabaseAdmin
    .from('surveys')
    .insert({ title, description, department, created_by: user.id })
    .select('id').single()

  if (error || !survey) return NextResponse.json({ error: error?.message }, { status: 500 })

  if (questions?.length) {
    await supabaseAdmin.from('survey_questions').insert(
      questions.map((q, i) => ({
        survey_id: survey.id,
        question: q.question,
        type: q.type ?? 'text',
        options: q.options ? JSON.stringify(q.options) : null,
        required: q.required ?? true,
        sort_order: i,
      }))
    )
  }

  return NextResponse.json({ ok: true, id: survey.id })
}
