'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronUp, ChevronDown, BookOpen, Users, Search, CalendarDays, Layers } from 'lucide-react'
import { DELAY_PRESETS, delayLabel, type WorkPlan, type WorkPlanBlock, type WorkPlanAssignment } from '@/lib/work-plans'

interface Course  { id: number; title: string; is_active: boolean }
interface Team    { id: number; name: string }
interface BlockCourse { id: number; course_id: number; sort_order: number; courses: Course }

interface FullBlock extends WorkPlanBlock {
  work_plan_block_courses: BlockCourse[]
}
interface FullAssignment extends WorkPlanAssignment {
  teams: { id: number; name: string } | null
}

interface Props {
  plan: WorkPlan
  blocks: FullBlock[]
  assignments: FullAssignment[]
  allCourses: Course[]
  allTeams: Team[]
}

type Tab = 'blocks' | 'assign'

export default function WorkPlanEditor({ plan, blocks: initBlocks, assignments: initAssignments, allCourses, allTeams }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('blocks')
  const [blocks, setBlocks] = useState(initBlocks)
  const [assignments, setAssignments] = useState(initAssignments)
  const [busy, setBusy] = useState(false)

  // New block form
  const [blockName, setBlockName] = useState('')
  const [blockDelay, setBlockDelay] = useState(0)

  // Course search per block
  const [courseSearch, setCourseSearch] = useState<Record<number, string>>({})

  // Assignment form
  const [assignTeamId, setAssignTeamId] = useState('')
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().split('T')[0])

  // ── Blocks ──────────────────────────────────────────────────────────────

  async function addBlock(e: React.FormEvent) {
    e.preventDefault()
    if (!blockName.trim()) return
    setBusy(true)
    const res = await fetch(`/api/work-plans/${plan.id}/blocks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: blockName.trim(), delay_days: blockDelay }),
    })
    const newBlock = await res.json()
    setBlocks(prev => [...prev, { ...newBlock, work_plan_block_courses: [] }])
    setBlockName(''); setBlockDelay(0); setBusy(false)
  }

  async function deleteBlock(blockId: number) {
    if (!confirm('Remove this block and all its courses from the plan?')) return
    await fetch(`/api/work-plans/${plan.id}/blocks/${blockId}`, { method: 'DELETE' })
    setBlocks(prev => prev.filter(b => b.id !== blockId))
  }

  async function moveBlock(blockId: number, dir: -1 | 1) {
    const idx = blocks.findIndex(b => b.id === blockId)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= blocks.length) return

    const reordered = [...blocks]
    const [moved] = reordered.splice(idx, 1)
    reordered.splice(newIdx, 0, moved)
    const updated = reordered.map((b, i) => ({ ...b, sort_order: i }))
    setBlocks(updated)

    await Promise.all(updated.map(b =>
      fetch(`/api/work-plans/${plan.id}/blocks/${b.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sort_order: b.sort_order }),
      })
    ))
  }

  // ── Block courses ────────────────────────────────────────────────────────

  async function addCourseToBlock(blockId: number, course: Course) {
    setBusy(true)
    await fetch(`/api/work-plans/${plan.id}/blocks/${blockId}/courses`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ course_id: course.id }),
    })
    setBlocks(prev => prev.map(b => b.id !== blockId ? b : {
      ...b,
      work_plan_block_courses: [...b.work_plan_block_courses, {
        id: Date.now(), course_id: course.id, sort_order: b.work_plan_block_courses.length, courses: course,
      }],
    }))
    setCourseSearch(prev => ({ ...prev, [blockId]: '' }))
    setBusy(false)
  }

  async function removeCourseFromBlock(blockId: number, courseId: number) {
    await fetch(`/api/work-plans/${plan.id}/blocks/${blockId}/courses?course_id=${courseId}`, { method: 'DELETE' })
    setBlocks(prev => prev.map(b => b.id !== blockId ? b : {
      ...b,
      work_plan_block_courses: b.work_plan_block_courses.filter(c => c.course_id !== courseId),
    }))
  }

  // ── Assignments ──────────────────────────────────────────────────────────

  async function assignTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!assignTeamId) return
    setBusy(true)
    const res = await fetch(`/api/work-plans/${plan.id}/assign`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ team_id: Number(assignTeamId), start_date: assignStartDate }),
    })
    const newAssignment = await res.json()
    const team = allTeams.find(t => t.id === Number(assignTeamId))
    setAssignments(prev => [...prev, { ...newAssignment, teams: team ?? null }])
    setAssignTeamId(''); setBusy(false)
    router.refresh()
  }

  async function removeAssignment(assignmentId: number) {
    await fetch(`/api/work-plans/${plan.id}/assign?assignment_id=${assignmentId}`, { method: 'DELETE' })
    setAssignments(prev => prev.filter(a => a.id !== assignmentId))
  }

  async function catchUpUser(teamId: number, teamStartDate: string) {
    const userId = prompt('Enter the learner\'s user ID to catch them up to all past-due blocks:')
    if (!userId) return
    setBusy(true)
    const res = await fetch(`/api/work-plans/${plan.id}/enroll-catchup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: userId, start_date: teamStartDate }),
    })
    const result = await res.json()
    alert(`Enrolled in ${result.enrolled} courses across ${result.blocks_due} due blocks.`)
    setBusy(false)
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
    color: tab === t ? 'var(--accent)' : 'var(--text2)',
    paddingBottom: '10px', marginBottom: '-1px',
    fontWeight: tab === t ? 600 : 400,
    cursor: 'pointer', fontSize: '14px', background: 'transparent', border: 'none',
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{plan.name}</h1>
        {plan.description && <p className="mt-1 text-sm" style={{ color: 'var(--text2)' }}>{plan.description}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <button style={tabStyle('blocks')} onClick={() => setTab('blocks')}>
          <span className="flex items-center gap-1.5"><Layers className="w-4 h-4" /> Blocks ({blocks.length})</span>
        </button>
        <button style={tabStyle('assign')} onClick={() => setTab('assign')}>
          <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Assigned to ({assignments.length})</span>
        </button>
      </div>

      {/* ── BLOCKS tab ── */}
      {tab === 'blocks' && (
        <div className="space-y-4">
          {/* Add block form */}
          <form onSubmit={addBlock} className="rounded-xl p-4 flex flex-wrap gap-3 items-end"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div className="flex-1 min-w-44">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text3)' }}>Block name</label>
              <input type="text" value={blockName} onChange={e => setBlockName(e.target.value)}
                placeholder="e.g. Week 1 Onboarding, Month 3 Review…"
                className="input-theme w-full px-3 py-2 rounded-lg text-sm" required />
            </div>
            <div className="min-w-44">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text3)' }}>Release after</label>
              <select value={blockDelay} onChange={e => setBlockDelay(Number(e.target.value))}
                className="input-theme w-full px-3 py-2 rounded-lg text-sm cursor-pointer">
                {DELAY_PRESETS.map(p => (
                  <option key={p.days} value={p.days}>{p.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={busy || !blockName.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
              <Plus className="w-4 h-4" /> Add Block
            </button>
          </form>

          {blocks.length === 0 && (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--text3)' }}>
              No blocks yet — add a block above to start building your curriculum.
            </p>
          )}

          {blocks.map((block, idx) => {
            const search = courseSearch[block.id] ?? ''
            const assignedIds = new Set(block.work_plan_block_courses.map(c => c.course_id))
            const available = allCourses.filter(c =>
              !assignedIds.has(c.id) && c.title.toLowerCase().includes(search.toLowerCase())
            )

            return (
              <div key={block.id} className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border)' }}>
                {/* Block header */}
                <div className="flex items-center gap-3 px-4 py-3"
                  style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveBlock(block.id, -1)} disabled={idx === 0}
                      className="cursor-pointer disabled:opacity-30" style={{ color: 'var(--text3)' }}>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveBlock(block.id, 1)} disabled={idx === blocks.length - 1}
                      className="cursor-pointer disabled:opacity-30" style={{ color: 'var(--text3)' }}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{block.name}</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
                      <CalendarDays className="w-3 h-3 inline mr-1" />
                      {delayLabel(block.delay_days)}
                    </span>
                  </div>
                  <button onClick={() => deleteBlock(block.id)}
                    className="p-1.5 rounded cursor-pointer" style={{ color: 'var(--text3)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Courses in block */}
                <div style={{ background: 'var(--bg3)' }}>
                  {block.work_plan_block_courses.map(bc => (
                    <div key={bc.course_id}
                      className="flex items-center justify-between px-4 py-2.5"
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <span className="text-sm flex items-center gap-2" style={{ color: 'var(--text)' }}>
                        <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text3)' }} />
                        {bc.courses.title}
                      </span>
                      <button onClick={() => removeCourseFromBlock(block.id, bc.course_id)}
                        className="p-1 cursor-pointer" style={{ color: 'var(--text3)' }}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add course to block */}
                  <div className="px-4 py-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text3)' }} />
                      <input
                        type="text"
                        value={search}
                        onChange={e => setCourseSearch(prev => ({ ...prev, [block.id]: e.target.value }))}
                        placeholder="Add course…"
                        className="input-theme w-full pl-8 pr-3 py-2 rounded-lg text-sm"
                      />
                    </div>
                    {search && (
                      <div className="mt-1 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                        {available.length === 0
                          ? <p className="px-3 py-2 text-xs" style={{ color: 'var(--text3)' }}>No courses found</p>
                          : available.slice(0, 5).map(c => (
                            <button key={c.id} onClick={() => addCourseToBlock(block.id, c)} disabled={busy}
                              className="w-full px-3 py-2 text-sm text-left cursor-pointer transition-colors disabled:opacity-50"
                              style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              {c.title}
                            </button>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── ASSIGN tab ── */}
      {tab === 'assign' && (
        <div className="space-y-4">
          <form onSubmit={assignTeam} className="rounded-xl p-4 flex flex-wrap gap-3 items-end"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div className="flex-1 min-w-44">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text3)' }}>Assign to team</label>
              <select value={assignTeamId} onChange={e => setAssignTeamId(e.target.value)}
                className="input-theme w-full px-3 py-2 rounded-lg text-sm cursor-pointer" required>
                <option value="">Select a team…</option>
                {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="min-w-44">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text3)' }}>Plan start date</label>
              <input type="date" value={assignStartDate} onChange={e => setAssignStartDate(e.target.value)}
                className="input-theme w-full px-3 py-2 rounded-lg text-sm" required />
            </div>
            <button type="submit" disabled={busy || !assignTeamId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
              <Plus className="w-4 h-4" /> Assign
            </button>
          </form>

          {assignments.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: 'var(--text3)' }}>
              Not assigned to any teams yet.
            </p>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {assignments.map((a, i) => (
                <div key={a.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    background: i % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)',
                    borderBottom: i < assignments.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {a.teams?.name ?? 'Unknown team'}
                    </span>
                    <span className="ml-3 text-xs" style={{ color: 'var(--text3)' }}>
                      Started {new Date(a.start_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => catchUpUser(a.team_id!, a.start_date)}
                      disabled={busy}
                      className="px-2.5 py-1 rounded text-xs cursor-pointer transition-colors disabled:opacity-50"
                      style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                      title="Enroll a new employee in all past-due blocks">
                      Catch-up user
                    </button>
                    <button onClick={() => removeAssignment(a.id)}
                      className="p-1.5 rounded cursor-pointer" style={{ color: 'var(--text3)' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg px-4 py-3 text-xs" style={{ background: 'var(--bg2)', color: 'var(--text3)', border: '1px solid var(--border)' }}>
            <strong style={{ color: 'var(--text2)' }}>Catch-up user</strong> — use this when a new employee joins a team mid-plan.
            It immediately enrolls them in all blocks whose delay has already elapsed since the plan start date.
          </div>
        </div>
      )}
    </div>
  )
}
