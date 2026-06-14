import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const search = url.searchParams.get('q') ?? ''
  const topic = url.searchParams.get('topic') ?? ''
  const industry = url.searchParams.get('industry') ?? ''

  let query = supabaseAdmin
    .from('video_library')
    .select('id, title, youtube_id, channel, thumbnail, topics, industries, description')
    .order('channel')
    .order('title')

  if (search) query = query.ilike('title', `%${search}%`)
  if (topic) query = query.contains('topics', [topic])
  if (industry) query = query.contains('industries', [industry])

  const { data } = await query.limit(200)
  return NextResponse.json({ videos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { course_id, video_id } = await req.json() as { course_id: number; video_id: string }

  const { data: vid } = await supabaseAdmin
    .from('video_library').select('title, youtube_id').eq('id', video_id).single()

  if (!vid) return NextResponse.json({ error: 'Video not found' }, { status: 404 })

  const { data: existing } = await supabaseAdmin
    .from('videos').select('sort_order').eq('course_id', course_id)
    .order('sort_order', { ascending: false }).limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1

  const { error } = await supabaseAdmin.from('videos').insert({
    course_id,
    title: vid.title,
    url: `https://www.youtube.com/watch?v=${vid.youtube_id}`,
    ytId: vid.youtube_id,
    duration_seconds: 600,
    sort_order: nextOrder,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
