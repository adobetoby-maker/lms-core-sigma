'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen, Video, HelpCircle, Users, Pencil, Trash2,
  Loader2, Archive, ArchiveRestore, ChevronDown, ChevronRight, Send,
} from 'lucide-react'
import PublishGroupModal from './PublishGroupModal'

interface Course {
  id: number
  title: string
  description: string
  is_active: boolean
  created_at: string
  videoCount: number
  questionCount: number
  enrollCount: number
}

interface Props { courses: Course[] }

export default function CourseTable({ courses }: Props) {
  const router = useRouter()
  const [selected, setSelected]           = useState<Set<number>>(new Set())
  const [deleting, setDeleting]           = useState<number | null>(null)
  const [archiving, setArchiving]         = useState<number | null>(null)
  const [deletingMulti, setDeletingMulti] = useState(false)
  const [archivedOpen, setArchivedOpen]   = useState(false)
  const [showPublish, setShowPublish]     = useState(false)
  const [, startTransition] = useTransition()

  const active   = courses.filter(c => c.is_active)
  const archived = courses.filter(c => !c.is_active)
  const allSelected = active.length > 0 && selected.size === active.length

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(active.map(c => c.id)))
  }
  function toggleOne(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function archiveCourse(id: number, archive: boolean) {
    setArchiving(id)
    await fetch(`/api/courses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !archive }),
    })
    setArchiving(null)
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    startTransition(() => router.refresh())
  }

  async function deleteCourse(id: number) {
    const title = courses.find(c => c.id === id)?.title
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeleting(id)
    await fetch(`/api/courses/${id}`, { method: 'DELETE' })
    setDeleting(null)
    startTransition(() => router.refresh())
  }

  async function deleteSelected() {
    if (!selected.size) return
    const names = courses.filter(c => selected.has(c.id)).map(c => c.title).join(', ')
    if (!confirm(`Delete ${selected.size} course${selected.size > 1 ? 's' : ''}?\n\n${names}\n\nThis cannot be undone.`)) return
    setDeletingMulti(true)
    await Promise.all([...selected].map(id => fetch(`/api/courses/${id}`, { method: 'DELETE' })))
    setSelected(new Set()); setDeletingMulti(false)
    startTransition(() => router.refresh())
  }

  function CourseRow({ course, isArchived = false }: { course: Course; isArchived?: boolean }) {
    return (
      <tr className={`transition-colors ${selected.has(course.id) ? 'bg-indigo-600/5' : 'hover:bg-[#252545]'}`}>
        {!isArchived && (
          <td className="pl-5 pr-2 py-4">
            <input type="checkbox" checked={selected.has(course.id)} onChange={() => toggleOne(course.id)}
              className="rounded border-slate-600 bg-[#0a0a18] text-indigo-500 cursor-pointer" />
          </td>
        )}
        {isArchived && <td className="pl-5 pr-2 py-4" />}

        <td className="px-3 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{course.title}</p>
              <p className="text-slate-500 text-xs truncate max-w-xs">{course.description}</p>
            </div>
          </div>
        </td>

        <td className="px-4 py-4 text-center hidden sm:table-cell">
          <div className="flex items-center justify-center gap-1.5 text-slate-300 text-sm">
            <Video className="w-3.5 h-3.5 text-slate-500" />{course.videoCount}
          </div>
        </td>
        <td className="px-4 py-4 text-center hidden sm:table-cell">
          <div className="flex items-center justify-center gap-1.5 text-slate-300 text-sm">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />{course.questionCount}
          </div>
        </td>
        <td className="px-4 py-4 text-center hidden md:table-cell">
          <div className="flex items-center justify-center gap-1.5 text-slate-300 text-sm">
            <Users className="w-3.5 h-3.5 text-slate-500" />{course.enrollCount}
          </div>
        </td>

        <td className="px-4 py-4 text-center">
          {isArchived ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/25">
              Archived
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              Active
            </span>
          )}
        </td>

        <td className="px-5 py-4">
          <div className="flex items-center justify-end gap-3">
            {!isArchived && (
              <Link href={`/admin/courses/${course.id}`}
                className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
                <Pencil className="w-3.5 h-3.5" />Edit
              </Link>
            )}

            <button onClick={() => archiveCourse(course.id, !isArchived)}
              disabled={archiving === course.id}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-amber-400 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              title={isArchived ? 'Restore' : 'Archive'}>
              {archiving === course.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : isArchived
                  ? <ArchiveRestore className="w-3.5 h-3.5" />
                  : <Archive className="w-3.5 h-3.5" />}
              {archiving === course.id ? '…' : isArchived ? 'Restore' : 'Archive'}
            </button>

            <button onClick={() => deleteCourse(course.id)} disabled={deleting === course.id}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-red-400 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50">
              {deleting === course.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {deleting === course.id ? '…' : 'Delete'}
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-3">
      {/* Multi-select toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
             style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
            {selected.size} course{selected.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPublish(true)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
              <Send className="w-4 h-4" />
              Publish as Group
            </button>
            <button onClick={deleteSelected} disabled={deletingMulti}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer">
              {deletingMulti ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deletingMulti ? 'Deleting…' : `Delete ${selected.size}`}
            </button>
          </div>
        </div>
      )}

      {/* Publish Group modal */}
      {showPublish && (
        <PublishGroupModal
          selectedCourses={active.filter(c => selected.has(c.id)).map(c => ({ id: c.id, title: c.title }))}
          onClose={() => setShowPublish(false)}
          onPublished={() => { setSelected(new Set()); startTransition(() => router.refresh()) }}
        />
      )}

      {/* Active courses table */}
      <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2a4a]">
              <th className="pl-5 pr-2 py-4 w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="rounded border-slate-600 bg-[#0a0a18] text-indigo-500 cursor-pointer" />
              </th>
              <th className="text-left px-3 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Course</th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Videos</th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Questions</th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Enrolled</th>
              <th className="text-center px-4 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
              <th className="text-right px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a4a]">
            {active.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500 text-sm">No active courses.</td></tr>
            ) : active.map(course => (
              <CourseRow key={course.id} course={course} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Archived section — collapsed single row, expandable */}
      {archived.length > 0 && (
        <div className="border border-[#2a2a4a] rounded-xl overflow-hidden">
          {/* Toggle row */}
          <button
            onClick={() => setArchivedOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-[#1a1a2e] hover:bg-[#252545] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Archive className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-slate-300">
                Archived
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                {archived.length}
              </span>
            </div>
            {archivedOpen
              ? <ChevronDown className="w-4 h-4 text-slate-500" />
              : <ChevronRight className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Expanded archived table */}
          {archivedOpen && (
            <table className="w-full bg-[#0d0d1f]">
              <tbody className="divide-y divide-[#2a2a4a]/50">
                {archived.map(course => (
                  <CourseRow key={course.id} course={course} isArchived />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
