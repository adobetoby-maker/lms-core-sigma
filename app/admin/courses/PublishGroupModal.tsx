'use client'

import { useState } from 'react'
import { X, Loader2, Calendar, Mail, Users, Send, CheckCircle2 } from 'lucide-react'

interface Course { id: number; title: string }

interface Props {
  selectedCourses: Course[]
  onClose: () => void
  onPublished: () => void
}

export default function PublishGroupModal({ selectedCourses, onClose, onPublished }: Props) {
  const [name, setName]           = useState('')
  const [description, setDesc]    = useState('')
  const [publishAt, setPublishAt] = useState('')     // '' = now
  const [dueAt, setDueAt]         = useState('')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyName, setNotifyName]   = useState('')
  const [emails, setEmails]       = useState('')      // newline-separated learner emails
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')

  async function handlePublish() {
    if (!name.trim()) { setError('Group name is required.'); return }
    setLoading(true); setError('')

    const res = await fetch('/api/course-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:         name.trim(),
        description:  description.trim(),
        publish_at:   publishAt || null,
        due_at:       dueAt || null,
        notify_email: notifyEmail.trim() || null,
        notify_name:  notifyName.trim() || null,
        course_ids:   selectedCourses.map(c => c.id),
        learner_emails: emails.split(/[\n,;]+/).map(e => e.trim()).filter(e => e.includes('@')),
      }),
    })

    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed to publish group.')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
    setTimeout(() => { onPublished(); onClose() }, 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl"
           style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Publish as Group</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
              {selectedCourses.length} course{selectedCourses.length > 1 ? 's' : ''} selected
            </p>
          </div>
          <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--text3)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Group published!</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>Invites are being sent.</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Selected courses */}
            <div className="rounded-xl p-3" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text3)' }}>Courses in group</p>
              {selectedCourses.map(c => (
                <div key={c.id} className="text-sm py-0.5" style={{ color: 'var(--text2)' }}>• {c.title}</div>
              ))}
            </div>

            {/* Group name */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text2)' }}>Group Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Q2 Compliance Training"
                className="input-theme w-full rounded-xl px-4 py-2.5 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text2)' }}>Description</label>
              <textarea value={description} onChange={e => setDesc(e.target.value)}
                placeholder="Required training for all staff this quarter."
                rows={2}
                className="input-theme w-full rounded-xl px-4 py-2.5 text-sm resize-none" />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text2)' }}>
                  <Calendar className="w-3.5 h-3.5" />Publish Date
                </label>
                <input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)}
                  className="input-theme w-full rounded-xl px-3 py-2.5 text-sm" />
                <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>Leave empty to publish now</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text2)' }}>
                  <Calendar className="w-3.5 h-3.5" />Due Date
                </label>
                <input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)}
                  className="input-theme w-full rounded-xl px-3 py-2.5 text-sm" />
                <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>Triggers overdue reminders</p>
              </div>
            </div>

            {/* Notify person */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text3)' }}>
                <Mail className="w-3.5 h-3.5" />Compliance Notification Contact
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text3)' }}>Name</label>
                  <input value={notifyName} onChange={e => setNotifyName(e.target.value)}
                    placeholder="HR Manager"
                    className="input-theme w-full rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text3)' }}>Email</label>
                  <input type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)}
                    placeholder="hr@company.com"
                    className="input-theme w-full rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>
                Weekly reminder + overdue alerts will be sent here every Monday.
              </p>
            </div>

            {/* Learner emails */}
            <div>
              <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text2)' }}>
                <Users className="w-3.5 h-3.5" />Assign to Employees
              </label>
              <textarea value={emails} onChange={e => setEmails(e.target.value)}
                placeholder="employee1@company.com&#10;employee2@company.com&#10;employee3@company.com"
                rows={4}
                className="input-theme w-full rounded-xl px-4 py-2.5 text-sm font-mono resize-none" />
              <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>
                One email per line. Invite links will be sent automatically.
              </p>
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                {error}
              </p>
            )}
          </div>
        )}

        {!done && (
          <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm cursor-pointer"
              style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button onClick={handlePublish} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {loading ? 'Publishing…' : 'Publish Group'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
