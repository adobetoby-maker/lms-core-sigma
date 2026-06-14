import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: survey }, { data: questions }, { data: existing }] = await Promise.all([
    supabaseAdmin.from('surveys').select('*').eq('id', id).single(),
    supabaseAdmin.from('survey_questions')
      .select('id, question, type, options, required, sort_order')
      .eq('survey_id', id).order('sort_order'),
    supabaseAdmin.from('survey_responses')
      .select('answers, submitted_at').eq('survey_id', id).eq('user_id', user.id).single(),
  ])

  if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ survey, questions: questions ?? [], response: existing })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { answers } = await req.json() as { answers: Record<string, unknown> }

  const { error } = await supabaseAdmin.from('survey_responses').upsert(
    { survey_id: id, user_id: user.id, answers, submitted_at: new Date().toISOString() },
    { onConflict: 'survey_id,user_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabaseAdmin.from('surveys').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
