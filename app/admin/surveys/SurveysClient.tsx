'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ClipboardList, X, GripVertical, CheckCircle, BarChart3, ChevronDown } from 'lucide-react'

interface Survey {
  id: string
  title: string
  description: string | null
  department: string | null
  is_active: boolean
  question_count: number
}

interface Question {
  question: string
  type: 'text' | 'rating' | 'multiple_choice' | 'yes_no'
  options?: string[]
  required: boolean
}

const QUESTION_TYPES = [
  { value: 'text',            label: 'Short answer' },
  { value: 'rating',          label: 'Rating (1–5)' },
  { value: 'yes_no',          label: 'Yes / No' },
  { value: 'multiple_choice', label: 'Multiple choice' },
]

const DEPARTMENTS = ['All Staff','Nursing','Administration','Emergency','Surgery','Lab','Radiology','Pharmacy','Housekeeping','HR','Finance','IT','Other']

export function AdminSurveysClient() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [tab, setTab]         = useState<'list' | 'create'>('list')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [department, setDepartment] = useState('All Staff')
  const [questions, setQuestions]   = useState<Question[]>([{ question: '', type: 'text', required: true }])

  const fetchSurveys = useCallback(async () => {
    const res = await fetch('/api/surveys')
    const data = await res.json() as { surveys: Survey[] }
    setSurveys(data.surveys ?? [])
  }, [])

  useEffect(() => { fetchSurveys() }, [fetchSurveys])

  const addQuestion = () => setQuestions(q => [...q, { question: '', type: 'text', required: true }])
  const removeQuestion = (i: number) => setQuestions(q => q.filter((_, idx) => idx !== i))
  const updateQ = (i: number, patch: Partial<Question>) =>
    setQuestions(q => q.map((item, idx) => idx === i ? { ...item, ...patch } : item))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || questions.every(q => !q.question.trim())) return
    setSaving(true)
    await fetch('/api/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, department, questions: questions.filter(q => q.question.trim()) }),
    })
    setSaved(true)
    setTitle(''); setDescription(''); setDepartment('All Staff')
    setQuestions([{ question: '', type: 'text', required: true }])
    fetchSurveys()
    setTimeout(() => { setSaved(false); setTab('list') }, 1200)
    setSaving(false)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    await fetch(`/api/surveys/${id}`, { method: 'DELETE' })
    setSurveys(s => s.filter(x => x.id !== id))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Surveys</h1>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>Create surveys for staff feedback and department check-ins.</p>
        </div>
        <button onClick={() => setTab(tab === 'create' ? 'list' : 'create')}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-bold text-white transition-colors cursor-pointer">
          {tab === 'create' ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {tab === 'create' ? 'Cancel' : 'New Survey'}
        </button>
      </div>

      {/* Create form */}
      {tab === 'create' && (
        <form onSubmit={handleCreate} className="card-theme rounded-2xl p-6 mb-6 space-y-5">
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Create Survey</h2>
          {saved && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" /> Survey created!
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>Survey Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="2026 Staff Satisfaction Survey"
              className="input-theme w-full px-4 py-2.5 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Takes 3 minutes"
                className="input-theme w-full px-4 py-2.5 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>Department</label>
              <div className="relative">
                <select value={department} onChange={e => setDepartment(e.target.value)}
                  className="input-theme w-full appearance-none px-4 py-2.5 pr-8 rounded-xl text-sm cursor-pointer">
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--text3)' }} />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Questions *</label>
              <button type="button" onClick={addQuestion}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">
                <Plus className="h-3.5 w-3.5" /> Add question
              </button>
            </div>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div key={i} className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 mt-2.5 flex-shrink-0" style={{ color: 'var(--text3)' }} />
                    <div className="flex-1 space-y-2">
                      <input value={q.question} onChange={e => updateQ(i, { question: e.target.value })}
                        placeholder={`Question ${i + 1}`}
                        className="input-theme w-full px-3 py-2 rounded-lg text-sm" />
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <select value={q.type} onChange={e => updateQ(i, { type: e.target.value as Question['type'] })}
                            className="input-theme w-full appearance-none px-3 py-1.5 pr-7 rounded-lg text-xs cursor-pointer">
                            {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" style={{ color: 'var(--text3)' }} />
                        </div>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text2)' }}>
                          <input type="checkbox" checked={q.required} onChange={e => updateQ(i, { required: e.target.checked })}
                            className="accent-indigo-600" />
                          Required
                        </label>
                      </div>
                      {q.type === 'multiple_choice' && (
                        <input
                          value={(q.options ?? []).join(', ')}
                          onChange={e => updateQ(i, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          placeholder="Option 1, Option 2, Option 3"
                          className="input-theme w-full px-3 py-1.5 rounded-lg text-xs" />
                      )}
                    </div>
                    {questions.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(i)}
                        className="p-1 transition-colors flex-shrink-0 hover:text-red-400 cursor-pointer" style={{ color: 'var(--text3)' }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-3 text-sm font-bold text-white transition-colors cursor-pointer">
            {saving ? 'Creating…' : 'Create Survey'}
          </button>
        </form>
      )}

      {/* Survey list */}
      {tab === 'list' && (
        <div className="space-y-3">
          {surveys.length === 0 ? (
            <div className="flex flex-col items-center py-16" style={{ color: 'var(--text3)' }}>
              <ClipboardList className="h-12 w-12 mb-3" />
              <p className="text-sm">No surveys yet.</p>
              <button onClick={() => setTab('create')} className="mt-3 text-indigo-400 text-sm underline cursor-pointer">
                Create your first survey →
              </button>
            </div>
          ) : surveys.map(s => (
            <div key={s.id} className="flex items-center gap-4 rounded-xl border px-4 py-3.5 card-theme" style={{ borderColor: 'var(--border)' }}>
              <BarChart3 className="h-5 w-5 text-indigo-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{s.title}</span>
                  {s.department && s.department !== 'All Staff' && (
                    <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full">{s.department}</span>
                  )}
                  <span className="text-[10px]" style={{ color: 'var(--text3)' }}>{s.question_count} question{s.question_count !== 1 ? 's' : ''}</span>
                  {!s.is_active && <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Inactive</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(s.id, s.title)}
                className="p-1 transition-colors flex-shrink-0 hover:text-red-400 cursor-pointer" style={{ color: 'var(--text3)' }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
