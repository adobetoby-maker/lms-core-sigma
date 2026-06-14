'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, CalendarDays, Layers, Users, Trash2, X } from 'lucide-react'
import type { WorkPlan } from '@/lib/work-plans'

interface Props { plans: WorkPlan[] }

export default function WorkPlansClient({ plans: initial }: Props) {
  const router = useRouter()
  const [plans, setPlans] = useState(initial)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/work-plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
    })
    if (!res.ok) { setError((await res.json()).error); setSaving(false); return }
    const created = await res.json()
    setPlans(prev => [...prev, { ...created, block_count: 0, assignment_count: 0 }])
    setName(''); setDescription(''); setShowCreate(false); setSaving(false)
    router.push(`/admin/work-plans/${created.id}`)
  }

  async function deletePlan(id: number, planName: string) {
    if (!confirm(`Delete "${planName}"? All blocks and assignments will be removed.`)) return
    await fetch(`/api/work-plans/${id}`, { method: 'DELETE' })
    setPlans(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div>
      <div className="flex justify-end mb-5">
        <button onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
          <Plus className="w-4 h-4" /> New Work Plan
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>New Work Plan</h2>
              <button onClick={() => setShowCreate(false)} style={{ color: 'var(--text3)' }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={create} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text2)' }}>Plan name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  placeholder="e.g. New Employee Onboarding, Annual Refresher…"
                  className="input-theme w-full px-3 py-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text2)' }}>Description (optional)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description"
                  className="input-theme w-full px-3 py-2 rounded-lg text-sm" />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 rounded-lg text-sm cursor-pointer"
                  style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving || !name.trim()}
                  className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                  {saving ? 'Creating…' : 'Create & Edit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <CalendarDays className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text3)' }} />
          <p className="font-medium mb-1" style={{ color: 'var(--text)' }}>No work plans yet</p>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>Create a plan to schedule phased course delivery across teams.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map(plan => (
            <div key={plan.id} className="rounded-xl p-5 group relative"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate" style={{ color: 'var(--text)' }}>{plan.name}</h3>
                  {plan.description && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text3)' }}>{plan.description}</p>
                  )}
                </div>
                <button onClick={() => deletePlan(plan.id, plan.name)}
                  className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded cursor-pointer transition-opacity"
                  style={{ color: 'var(--text3)' }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3 mb-4">
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text2)' }}>
                  <Layers className="w-3.5 h-3.5" /> {plan.block_count} {plan.block_count === 1 ? 'block' : 'blocks'}
                </span>
                <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text2)' }}>
                  <Users className="w-3.5 h-3.5" /> {plan.assignment_count} assigned
                </span>
              </div>
              <Link href={`/admin/work-plans/${plan.id}`}
                className="inline-flex items-center gap-1 text-xs font-medium"
                style={{ color: 'var(--accent)' }}>
                Edit plan <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
