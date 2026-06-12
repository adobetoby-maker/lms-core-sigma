import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import StatusBadge from '@/components/StatusBadge'
import CourseClient from './CourseClient'
import { Clock, ArrowLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ]
  for (const pat of patterns) {
    const m = url.match(pat)
    if (m) return m[1]
  }
  return null
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? m[1] : null
}

export default async function CoursePage({ params }: PageProps) {
  const { id } = await params
  const courseId = Number(id)

  if (isNaN(courseId)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch course
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, description, require_full_video_watch, is_active')
    .eq('id', courseId)
    .single()

  if (!course || !course.is_active) notFound()

  // Check enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, status, video_watched')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

  if (!enrollment) redirect('/dashboard')

  // Fetch videos
  const { data: videos } = await supabase
    .from('videos')
    .select('id, title, url, duration_seconds, sort_order')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true })

  // Fetch questions (only if enrolled)
  const { data: questions } = await supabase
    .from('questions')
    .select('id, text, option_a, option_b, option_c, option_d')
    .eq('course_id', courseId)

  const videoList = videos ?? []
  const questionList = questions ?? []
  const status = enrollment.status as 'invited' | 'in_progress' | 'passed' | 'failed'
  // No videos → treat as watched so the quiz is immediately accessible
  const effectiveVideoWatched = videoList.length === 0 ? true : enrollment.video_watched

  const firstVideo = videoList[0]
  const firstYtId = firstVideo ? extractYouTubeId(firstVideo.url) : null

  return (
    <div className="min-h-screen bg-[#0a0a18]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        {/* Back + Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{course.title}</h1>
              <p className="text-slate-400 max-w-2xl">{course.description}</p>
            </div>
            <StatusBadge status={status} className="mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <CourseClient
              courseId={courseId}
              enrollmentId={enrollment.id}
              videoWatched={effectiveVideoWatched}
              status={status}
              videos={videoList.map(v => ({
                ...v,
                ytId: extractYouTubeId(v.url),
                vimeoId: extractVimeoId(v.url),
              }))}
              questions={questionList}
              requireFullVideoWatch={course.require_full_video_watch}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Video list */}
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">
                Course Videos
              </h2>
              {videoList.length === 0 ? (
                <p className="text-slate-500 text-sm">No videos available yet.</p>
              ) : (
                <div className="space-y-3">
                  {videoList.map((video, i) => {
                    const ytId = extractYouTubeId(video.url)
                    const vimeoId = extractVimeoId(video.url)
                    const isLocal = !ytId && !vimeoId
                    const badge = ytId
                      ? { label: 'YouTube', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
                      : vimeoId
                      ? { label: 'Vimeo',   color: '#1ab7ea', bg: 'rgba(26,183,234,0.12)' }
                      : { label: 'Local',   color: '#34d399', bg: 'rgba(52,211,153,0.12)' }
                    return (
                    <div
                      key={video.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-[#0a0a18] border border-[#2a2a4a]"
                    >
                      <div className="w-7 h-7 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-400">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{video.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded"
                            style={{ background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                          {video.duration_seconds > 0 && (
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(video.duration_seconds)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quiz info */}
            {questionList.length > 0 && (
              <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">
                  Quiz
                </h2>
                <p className="text-slate-400 text-sm">
                  {questionList.length} multiple-choice question{questionList.length !== 1 ? 's' : ''}
                </p>
                {!effectiveVideoWatched && videoList.length > 0 && (
                  <p className="text-xs text-amber-400 mt-2">
                    Watch the video first to unlock the quiz.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
