'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Loader2, PlayCircle, AlertCircle, Trophy, ArrowLeft, Award } from 'lucide-react'

type Video = {
  id: number
  title: string
  url: string
  duration_seconds: number
  sort_order: number
  ytId: string | null
  vimeoId?: string | null
}

type Question = {
  id: number
  text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
}

type Status = 'invited' | 'in_progress' | 'passed' | 'failed'

type Attempt = {
  id: number
  score: number
  passed: boolean
  correct_count: number
  total_count: number
  attempted_at: string
}

interface Props {
  courseId: number
  enrollmentId: number
  videoWatched: boolean
  status: Status
  videos: Video[]
  questions: Question[]
  priorAttempts: Attempt[]
  requireFullVideoWatch: boolean
}

interface QuizResult {
  score: number
  passed: boolean
  correctCount: number
  totalCount: number
}

const OPTIONS = ['A', 'B', 'C', 'D'] as const
type Option = typeof OPTIONS[number]

export default function CourseClient({
  courseId,
  enrollmentId,
  videoWatched: initialVideoWatched,
  status: initialStatus,
  videos,
  questions,
  priorAttempts,
  requireFullVideoWatch,
}: Props) {
  const [videoWatched, setVideoWatched] = useState(initialVideoWatched)
  const [status, setStatus] = useState<Status>(initialStatus)
  const [markingWatched, setMarkingWatched] = useState(false)
  const [answers, setAnswers] = useState<Record<number, Option>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuizResult | null>(null)
  const [quizError, setQuizError] = useState<string | null>(null)
  const [activeVideoIdx, setActiveVideoIdx] = useState(0)

  const currentVideo = videos[activeVideoIdx]
  const allAnswered = questions.length > 0 && questions.every(q => answers[q.id])

  async function handleMarkWatched() {
    setMarkingWatched(true)
    const supabase = createClient()

    const isVideoOnly = questions.length === 0
    const update = isVideoOnly
      ? { video_watched: true, status: 'passed' as const, completed_at: new Date().toISOString() }
      : { video_watched: true, status: 'in_progress' as const }

    const { error } = await supabase
      .from('enrollments')
      .update(update)
      .eq('id', enrollmentId)

    if (!error) {
      setVideoWatched(true)
      setStatus(isVideoOnly ? 'passed' : status === 'invited' ? 'in_progress' : status)
      if (isVideoOnly) {
        setResult({ score: 100, passed: true, correctCount: 0, totalCount: 0 })
      }
    }
    setMarkingWatched(false)
  }

  async function handleSubmitQuiz() {
    if (!allAnswered) return
    setSubmitting(true)
    setQuizError(null)

    const answersArray = questions.map(q => ({
      questionId: q.id,
      answer: answers[q.id],
    }))

    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, answers: answersArray }),
    })

    if (!res.ok) {
      setQuizError('Failed to submit quiz. Please try again.')
      setSubmitting(false)
      return
    }

    const data: QuizResult = await res.json()
    setResult(data)
    setStatus(data.passed ? 'passed' : 'failed')
    setSubmitting(false)
  }

  function handleRetry() {
    setAnswers({})
    setResult(null)
    setQuizError(null)
  }

  const optionLabel: Record<Option, string> = {
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
  }

  function getOptionText(q: Question, opt: Option): string {
    const map: Record<Option, string> = {
      A: q.option_a,
      B: q.option_b,
      C: q.option_c,
      D: q.option_d,
    }
    return map[opt]
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Video player */}
      {videos.length > 0 && (
        <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-[#2a2a4a] flex items-center gap-3">
            <PlayCircle className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              {currentVideo?.title ?? 'Video Lesson'}
            </h2>
          </div>

          {/* Video selector tabs if multiple */}
          {videos.length > 1 && (
            <div className="flex gap-1 px-5 pt-4 flex-wrap">
              {videos.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setActiveVideoIdx(i)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    i === activeVideoIdx
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#0a0a18] text-slate-400 hover:text-white border border-[#2a2a4a]'
                  }`}
                >
                  {i + 1}. {v.title}
                </button>
              ))}
            </div>
          )}

          {/* Embed + fallback */}
          <div className="p-5 space-y-3">
            {currentVideo?.ytId ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${currentVideo.ytId}?rel=0&modestbranding=1`}
                  title={currentVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            ) : currentVideo?.vimeoId ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={`https://player.vimeo.com/video/${currentVideo.vimeoId}?h=auto&badge=0&autopause=0&player_id=0&app_id=58479`}
                  title={currentVideo.title}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            ) : currentVideo?.url.includes('supabase') || currentVideo?.url.endsWith('.mp4') || currentVideo?.url.endsWith('.webm') ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                <video
                  src={currentVideo.url}
                  controls
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            ) : (
              <div className="w-full aspect-video rounded-lg bg-[#0a0a18] border border-[#2a2a4a] flex items-center justify-center">
                <PlayCircle className="w-12 h-12 text-slate-600" />
              </div>
            )}

            {/* Always show open link — TED talks often block embedding */}
            {currentVideo?.url && (
              <a
                href={currentVideo.url.replace('/embed/', '/watch?v=')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                If the video is blocked, watch it on YouTube →
              </a>
            )}
          </div>

          {/* Mark watched button */}
          <div className="px-5 pb-5">
            {videoWatched ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <CheckCircle className="w-5 h-5" />
                Video marked as watched
              </div>
            ) : (
              <button
                onClick={handleMarkWatched}
                disabled={markingWatched}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              >
                {markingWatched ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Mark as Watched
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quiz section */}
      {questions.length > 0 && (
        <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl">
          <div className="p-5 border-b border-[#2a2a4a]">
            <h2 className="text-base font-semibold text-white">Knowledge Check</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {questions.length} question{questions.length !== 1 ? 's' : ''} — answer all to submit
            </p>
          </div>

          {!videoWatched ? (
            <div className="p-6 text-center">
              <PlayCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-amber-400 font-medium">Watch the video first</p>
              <p className="text-slate-500 text-sm mt-1">
                Complete the video lesson above to unlock this quiz.
              </p>
            </div>
          ) : result ? (
            /* Quiz result */
            <div className="p-6">
              <div className={`text-center p-6 rounded-xl border ${
                result.passed
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                {result.passed ? (
                  <Trophy className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                )}
                <h3 className={`text-2xl font-bold mb-1 ${result.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.passed ? 'Congratulations!' : 'Not quite right'}
                </h3>
                {result.totalCount > 0 && (
                  <>
                    <p className="text-white text-4xl font-black mb-3">{result.score}%</p>
                    <p className="text-slate-300 text-sm">
                      {result.correctCount} of {result.totalCount} correct
                    </p>
                  </>
                )}
                <p className={`text-sm font-medium mt-2 ${result.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.passed ? 'You passed this course!' : 'You need 70% or higher to pass.'}
                </p>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                {result.passed ? (
                  <>
                    <Link
                      href={`/certificate/${enrollmentId}`}
                      className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
                    >
                      <Award className="w-4 h-4" />
                      View &amp; Download Certificate
                    </Link>
                    <Link
                      href="/dashboard"
                      className="flex items-center justify-center gap-2 bg-[#0a0a18] hover:bg-[#252545] border border-[#2a2a4a] text-slate-300 font-medium py-3 rounded-lg text-sm transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Dashboard
                    </Link>
                  </>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleRetry}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg text-sm transition-colors"
                    >
                      Try Again
                    </button>
                    <Link
                      href="/dashboard"
                      className="flex-1 flex items-center justify-center gap-2 bg-[#0a0a18] hover:bg-[#252545] border border-[#2a2a4a] text-slate-300 font-medium py-3 rounded-lg text-sm transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Quiz form */
            <div className="p-5 space-y-6">
              {quizError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{quizError}</p>
                </div>
              )}

              {questions.map((q, qi) => (
                <div key={q.id} className="space-y-3">
                  <p className="text-white font-medium text-sm">
                    <span className="text-indigo-400 font-bold">{qi + 1}.</span>{' '}
                    {q.text}
                  </p>
                  <div className="space-y-2">
                    {OPTIONS.map(opt => {
                      const selected = answers[q.id] === opt
                      return (
                        <button
                          key={opt}
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border text-sm transition-colors ${
                            selected
                              ? 'bg-indigo-600/20 border-indigo-500 text-white'
                              : 'bg-[#0a0a18] border-[#2a2a4a] text-slate-300 hover:border-indigo-500/50 hover:text-white'
                          }`}
                        >
                          <span className={`shrink-0 w-5 h-5 rounded-full border text-xs flex items-center justify-center font-bold ${
                            selected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-[#3a3a5a] text-slate-500'
                          }`}>
                            {opt}
                          </span>
                          <span>{getOptionText(q, opt)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSubmitQuiz}
                  disabled={!allAnswered || submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : !allAnswered ? (
                    `Answer all questions to submit (${Object.keys(answers).length}/${questions.length})`
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Submit Answers
                    </>
                  )}
                </button>
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 px-4 bg-[#0a0a18] hover:bg-[#252545] border border-[#2a2a4a] text-slate-400 hover:text-white rounded-lg text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attempt history */}
      {priorAttempts.length > 0 && (
        <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">
            Attempt History
          </h2>
          <div className="space-y-2">
            {priorAttempts.map((a, i) => (
              <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b border-[#2a2a4a] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs w-5">{i + 1}</span>
                  <span className={a.passed ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                    {a.passed ? 'Passed' : 'Failed'}
                  </span>
                  <span className="text-white font-bold">{a.score}%</span>
                  <span className="text-slate-500 text-xs">{a.correct_count}/{a.total_count} correct</span>
                </div>
                <span className="text-slate-500 text-xs">
                  {new Date(a.attempted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
