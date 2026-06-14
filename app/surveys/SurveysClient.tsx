'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, CheckCircle2, ChevronRight, Star } from 'lucide-react'

interface Survey { id: string; title: string; description: string | null; department: string | null; question_count: number; completed: boolean }
interface Question { id: string; question: string; type: string; options: string[] | null; required: boolean; sort_order: number }

export function SurveysClient() {
  const [surveys, setSurveys]   = useState<Survey[]>([])
  const [active, setActive]     = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers]   = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [loading, setLoading]   = useState(true)

  const fetchSurveys = useCallback(async () => {
    const res = await fetch('/api/surveys')
    const data = await res.json() as { surveys: Survey[] }
    setSurveys(data.surveys ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSurveys() }, [fetchSurveys])

  const openSurvey = async (id: string) => {
    const res = await fetch(`/api/surveys/${id}`)
    const data = await res.json() as { questions: Question[]; response?: { answers: Record<string, unknown> } }
    setQuestions(data.questions)
    setAnswers(data.response?.answers ?? {})
    setSubmitted(!!data.response)
    setActive(id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!active) return
    setSubmitting(true)
    await fetch(`/api/surveys/${active}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    setSubmitted(true)
    setSubmitting(false)
    setSurveys(s => s.map(x => x.id === active ? { ...x, completed: true } : x))
  }

  const activeSurvey = surveys.find(s => s.id === active)
  const pending      = surveys.filter(s => !s.completed)
  const done         = surveys.filter(s => s.completed)

  if (active) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => setActive(null)}
          className="text-sm mb-6 flex items-center gap-1 transition-colors cursor-pointer"
          style={{ color: 'var(--text2)' }}>
          ← Back to surveys
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>{activeSurvey?.title}</h1>
          {activeSurvey?.description && <p className="text-sm" style={{ color: 'var(--text2)' }}>{activeSurvey.description}</p>}
          {activeSurvey?.department && activeSurvey.department !== 'All Staff' && (
            <span className="inline-block mt-2 text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full">{activeSurvey.department}</span>
          )}
        </div>

        {submitted ? (
          <div className="flex flex-col items-center py-16 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mb-4" />
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Response recorded</h2>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>Thank you for completing this survey.</p>
            <button onClick={() => setActive(null)} className="mt-6 text-indigo-400 text-sm underline">Back to surveys</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-2xl p-5 card-theme">
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
                  {i + 1}. {q.question}
                  {q.required && <span className="text-red-400 ml-1">*</span>}
                </p>

                {q.type === 'text' && (
                  <textarea rows={3} value={(answers[q.id] as string) ?? ''}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    required={q.required} placeholder="Your answer…"
                    className="input-theme w-full px-4 py-3 rounded-xl text-sm resize-none placeholder:opacity-40" />
                )}

                {q.type === 'rating' && (
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button"
                        onClick={() => setAnswers(a => ({ ...a, [q.id]: n }))}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                          (answers[q.id] as number) === n ? 'bg-indigo-600 border-indigo-500 text-white' : ''
                        }`}
                        style={(answers[q.id] as number) === n ? {} : { borderColor: 'var(--border)', color: 'var(--text2)' }}>
                        {n} <Star className="h-3 w-3 inline ml-0.5" />
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'yes_no' && (
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button"
                        onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                        className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-colors ${
                          answers[q.id] === opt ? 'bg-indigo-600 border-indigo-500 text-white' : ''
                        }`}
                        style={answers[q.id] === opt ? {} : { borderColor: 'var(--border)', color: 'var(--text2)' }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {(q.options ?? []).map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          answers[q.id] === opt ? 'border-indigo-500 bg-indigo-600' : ''
                        }`}
                        style={answers[q.id] === opt ? {} : { borderColor: 'var(--border)' }}
                        onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}>
                          {answers[q.id] === opt && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--text2)' }}>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button type="submit" disabled={submitting}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-3.5 text-sm font-bold text-white transition-colors">
              {submitting ? 'Submitting…' : 'Submit Survey'}
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Surveys</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>Staff feedback and check-in surveys from your organization.</p>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--text3)' }}>Loading…</div>
      ) : surveys.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <ClipboardList className="h-12 w-12 mb-3" style={{ color: 'var(--text3)' }} />
          <p className="text-sm" style={{ color: 'var(--text2)' }}>No surveys available yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" /> Needs your response
              </p>
              <div className="space-y-2">
                {pending.map(s => (
                  <button key={s.id} onClick={() => openSurvey(s.id)}
                    className="w-full flex items-center gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 px-4 py-3.5 transition-colors group text-left">
                    <ClipboardList className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{s.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                        {s.description ?? `${s.question_count} question${s.question_count !== 1 ? 's' : ''}`}
                        {s.department && s.department !== 'All Staff' && ` · ${s.department}`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 group-hover:text-amber-400 transition-colors" style={{ color: 'var(--text3)' }} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completed
              </p>
              <div className="space-y-2">
                {done.map(s => (
                  <button key={s.id} onClick={() => openSurvey(s.id)}
                    className="w-full flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 px-4 py-3.5 transition-colors group text-left">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{s.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                        {s.question_count} question{s.question_count !== 1 ? 's' : ''} · Response submitted
                      </p>
                    </div>
                    <span className="text-xs text-emerald-400">View →</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
