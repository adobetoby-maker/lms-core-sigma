'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Upload, Trash2, FileText, CheckCircle, Users, AlertCircle,
  Shield, HardDrive, Download, Lock, Plus, X, Eye, EyeOff,
  Settings, Database, Sparkles,
} from 'lucide-react'

interface Doc {
  id: string
  title: string
  description?: string
  category: string
  file_name: string
  file_size?: number
  requires_ack: boolean
  visibility: 'all' | 'teams' | 'admin_only'
  created_at: string
  version?: number
}

interface DocVersion {
  id: string
  version: number
  file_name: string
  file_size: number | null
  content_hash: string | null
  uploaded_at: string
  notes: string | null
  uploader: { first_name: string; last_name: string; email: string } | null
  ack_count: number
}

interface ReportStaff {
  name: string
  acknowledged: boolean
  acked_at: string | null
  document_version: number | null
}

interface ReportDoc {
  document: { id: string; title: string; category: string; version: number }
  total_staff: number
  acked: number
  pending: number
  completion_pct: number
  staff: ReportStaff[]
}

interface Team { id: number; name: string }
interface AccessRule { id: number; team_id: number; is_required: boolean; teams: { id: number; name: string } }

const CATEGORIES = ['HR', 'Compliance', 'Safety', 'Clinical', 'Operations', 'Product', 'Leadership', 'General']
const VISIBILITY_OPTS = [
  { value: 'all',        label: 'All Staff',    icon: Eye,    desc: 'Every logged-in user can see this' },
  { value: 'teams',      label: 'Assigned Teams', icon: Users, desc: 'Only teams you specify below' },
  { value: 'admin_only', label: 'Admin Only',   icon: Lock,   desc: 'Hidden from learners entirely' },
]

const TAB_LIST = [
  { key: 'library',   label: 'Library',      icon: FileText },
  { key: 'upload',    label: 'Upload',        icon: Upload },
  { key: 'access',    label: 'Access Rules',  icon: Shield },
  { key: 'report',    label: 'Ack Report',    icon: CheckCircle },
  { key: 'storage',   label: 'Storage',       icon: HardDrive },
  { key: 'vault',     label: 'Cold Vault',    icon: Database },
] as const

type Tab = typeof TAB_LIST[number]['key']

export function AdminDocsClient() {
  const [docs, setDocs]       = useState<Doc[]>([])
  const [report, setReport]   = useState<ReportDoc[]>([])
  const [teams, setTeams]     = useState<Team[]>([])
  const [tab, setTab]         = useState<Tab>('library')
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({ title: '', description: '', category: 'HR', requires_ack: false })
  const [file, setFile]       = useState<File | null>(null)
  const [seeding, setSeeding] = useState(false)
  // Access rules state
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null)
  const [accessRules, setAccessRules] = useState<AccessRule[]>([])
  const [docVisibility, setDocVisibility] = useState<string>('all')
  const [addingTeam, setAddingTeam] = useState(false)
  const [newTeamId, setNewTeamId] = useState('')
  const [newRequired, setNewRequired] = useState(false)
  // Vault state
  const [vaultLoading, setVaultLoading] = useState(false)
  // Ack report expanded doc
  const [expandedReportDoc, setExpandedReportDoc] = useState<string | null>(null)
  // Version history slide-over
  const [historyDoc, setHistoryDoc] = useState<Doc | null>(null)
  const [versions, setVersions] = useState<DocVersion[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [versionNotes, setVersionNotes] = useState('')
  const [versionUploading, setVersionUploading] = useState(false)

  const fetchDocs = useCallback(async () => {
    const res = await fetch('/api/documents')
    const data = await res.json() as { documents: Doc[] }
    setDocs(data.documents ?? [])
  }, [])

  const fetchReport = useCallback(async () => {
    const res = await fetch('/api/documents/ack')
    const data = await res.json() as { report: ReportDoc[] }
    setReport(data.report ?? [])
  }, [])

  const fetchTeams = useCallback(async () => {
    const res = await fetch('/api/teams')
    const data = await res.json() as { teams: Team[] }
    setTeams(data.teams ?? [])
  }, [])

  const loadDocAccess = useCallback(async (doc: Doc) => {
    setSelectedDoc(doc)
    setDocVisibility(doc.visibility)
    setAccessRules([])
    const res = await fetch(`/api/documents/${doc.id}/access`)
    const data = await res.json() as { access: AccessRule[] }
    setAccessRules(data.access ?? [])
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])
  useEffect(() => { if (tab === 'report') fetchReport() }, [tab, fetchReport])
  useEffect(() => { if (tab === 'access') fetchTeams() }, [tab, fetchTeams])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !form.title) return
    setUploading(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', form.title)
    fd.append('description', form.description)
    fd.append('category', form.category)
    fd.append('requires_ack', String(form.requires_ack))
    const res = await fetch('/api/documents', { method: 'POST', body: fd })
    if (res.ok) {
      setSuccess('Document uploaded.')
      setForm({ title: '', description: '', category: 'HR', requires_ack: false })
      setFile(null)
      fetchDocs()
      setTimeout(() => setSuccess(''), 3000)
    } else {
      const d = await res.json() as { error?: string }
      setError(d.error ?? 'Upload failed')
    }
    setUploading(false)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    await fetch('/api/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  const handleSeedDemo = async () => {
    if (!confirm('Load 20 demo documents? Only works on an empty library.')) return
    setSeeding(true)
    const res = await fetch('/api/documents/seed-demo', { method: 'POST' })
    const data = await res.json() as { ok?: boolean; count?: number; error?: string }
    if (data.ok) { setSuccess(`Loaded ${data.count} demo documents.`); fetchDocs() }
    else setError(data.error ?? 'Seed failed')
    setSeeding(false)
    setTimeout(() => { setSuccess(''); setError('') }, 4000)
  }

  const handleVisibilityChange = async (visibility: string) => {
    if (!selectedDoc) return
    setDocVisibility(visibility)
    await fetch(`/api/documents/${selectedDoc.id}/access`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility }),
    })
    setDocs(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, visibility: visibility as Doc['visibility'] } : d))
    setSelectedDoc(prev => prev ? { ...prev, visibility: visibility as Doc['visibility'] } : null)
  }

  const handleAddTeam = async () => {
    if (!selectedDoc || !newTeamId) return
    const res = await fetch(`/api/documents/${selectedDoc.id}/access`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: parseInt(newTeamId), is_required: newRequired }),
    })
    if (res.ok) {
      setNewTeamId(''); setNewRequired(false); setAddingTeam(false)
      const d = await res.json() as AccessRule
      const team = teams.find(t => t.id === parseInt(newTeamId))
      if (team) setAccessRules(prev => [...prev, { ...d, teams: team }])
    }
  }

  const handleRemoveAccess = async (ruleId: number) => {
    if (!selectedDoc) return
    await fetch(`/api/documents/${selectedDoc.id}/access`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_id: ruleId }),
    })
    setAccessRules(prev => prev.filter(r => r.id !== ruleId))
  }

  const handleToggleRequired = async (rule: AccessRule) => {
    if (!selectedDoc) return
    const updated = !rule.is_required
    await fetch(`/api/documents/${selectedDoc.id}/access`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_id: rule.id, is_required: updated }),
    })
    setAccessRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_required: updated } : r))
  }

  const openHistory = async (doc: Doc) => {
    setHistoryDoc(doc)
    setVersions([])
    setVersionFile(null)
    setVersionNotes('')
    setVersionsLoading(true)
    const res = await fetch(`/api/documents/${doc.id}/versions`)
    const data = await res.json() as { versions: DocVersion[] }
    setVersions(data.versions ?? [])
    setVersionsLoading(false)
  }

  const closeHistory = () => {
    setHistoryDoc(null)
    setVersions([])
    setVersionFile(null)
    setVersionNotes('')
  }

  const handleVersionUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!historyDoc || !versionFile) return
    setVersionUploading(true)
    const fd = new FormData()
    fd.append('file', versionFile)
    if (versionNotes.trim()) fd.append('notes', versionNotes.trim())
    const res = await fetch(`/api/documents/${historyDoc.id}/version`, { method: 'POST', body: fd })
    if (res.ok) {
      const data = await res.json() as { ok: boolean; version: number }
      setVersionFile(null)
      setVersionNotes('')
      setDocs(prev => prev.map(d => d.id === historyDoc.id ? { ...d, version: data.version } : d))
      setHistoryDoc(prev => prev ? { ...prev, version: data.version } : null)
      const vRes = await fetch(`/api/documents/${historyDoc.id}/versions`)
      const vData = await vRes.json() as { versions: DocVersion[] }
      setVersions(vData.versions ?? [])
    }
    setVersionUploading(false)
  }

  const handleVaultDownload = async () => {
    setVaultLoading(true)
    const res = await fetch('/api/documents/vault')
    if (!res.ok) { setVaultLoading(false); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lms-vault-${new Date().toISOString().slice(0, 10)}.vault`
    a.click()
    URL.revokeObjectURL(url)
    setVaultLoading(false)
  }

  const visibilityIcon = (v: string) => {
    if (v === 'admin_only') return <Lock className="w-3 h-3 text-red-400" />
    if (v === 'teams') return <Users className="w-3 h-3 text-amber-400" />
    return <Eye className="w-3 h-3" style={{ color: 'var(--text3)' }} />
  }

  const totalStorage = docs.reduce((sum, d) => sum + (d.file_size ?? 0), 0)
  const fmtBytes = (b: number) => b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${(b / 1_000).toFixed(0)} KB`

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Document Control Panel</h1>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            {docs.length} documents · {fmtBytes(totalStorage)} used
          </p>
        </div>
        {docs.length === 0 && (
          <button onClick={handleSeedDemo} disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
            <Sparkles className="w-4 h-4" />
            {seeding ? 'Loading…' : 'Load Demo Content'}
          </button>
        )}
      </div>

      {(success || error) && (
        <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${success ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {success || error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-xl p-1 w-fit" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        {TAB_LIST.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            style={tab === key
              ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
              : { color: 'var(--text2)' }}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* ── LIBRARY ─────────────────────────────── */}
      {tab === 'library' && (
        <div className="space-y-2">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center py-16" style={{ color: 'var(--text3)' }}>
              <FileText className="h-10 w-10 mb-3" />
              <p className="text-sm mb-1">No documents yet.</p>
              <button onClick={() => setTab('upload')} className="text-xs underline cursor-pointer" style={{ color: 'var(--accent)' }}>Upload first →</button>
            </div>
          ) : docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
              <FileText className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--text3)' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{doc.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--text3)', background: 'var(--bg3)' }}>{doc.category}</span>
                  {doc.requires_ack && <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Ack required</span>}
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text3)' }}>
                    {visibilityIcon(doc.visibility)} {doc.visibility === 'admin_only' ? 'Admin only' : doc.visibility === 'teams' ? 'Teams only' : 'All staff'}
                  </span>
                </div>
                {doc.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text3)' }}>{doc.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                {(doc.version ?? 1) > 1 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
                    v{doc.version}
                  </span>
                )}
                <button onClick={() => openHistory(doc)}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer" title="Version history"
                  style={{ color: 'var(--text3)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </button>
                <button onClick={() => { setSelectedDoc(doc); loadDocAccess(doc); setTab('access') }}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer" title="Access rules"
                  style={{ color: 'var(--text3)' }}>
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(doc.id, doc.title)}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer hover:text-red-400"
                  style={{ color: 'var(--text3)' }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── UPLOAD ──────────────────────────────── */}
      {tab === 'upload' && (
        <form onSubmit={handleUpload} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>Document Title *</label>
            <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="2026 Employee Handbook"
              className="input-theme w-full px-4 py-3 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>Description</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description"
              className="input-theme w-full px-4 py-3 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="input-theme w-full px-4 py-3 rounded-xl text-sm cursor-pointer">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>PDF File *</label>
            <div className="relative flex items-center justify-center rounded-xl border-2 border-dashed p-6 cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
              onClick={() => document.getElementById('file-input')?.click()}>
              <input id="file-input" type="file" accept=".pdf" className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
              {file ? (
                <div className="text-center">
                  <FileText className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{file.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--text3)' }} />
                  <p className="text-sm" style={{ color: 'var(--text2)' }}>Click to upload PDF</p>
                </div>
              )}
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${form.requires_ack ? 'bg-indigo-600 border-indigo-600' : ''}`}
              style={form.requires_ack ? {} : { borderColor: 'var(--border)' }}
              onClick={() => setForm(f => ({ ...f, requires_ack: !f.requires_ack }))}>
              {form.requires_ack && <CheckCircle className="h-3.5 w-3.5 text-white" />}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Require acknowledgment</p>
              <p className="text-xs" style={{ color: 'var(--text3)' }}>Staff must click "I have read this" — tracked</p>
            </div>
          </label>
          <button type="submit" disabled={uploading || !file || !form.title}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent)' }}>
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Upload Document'}
          </button>
        </form>
      )}

      {/* ── ACCESS RULES ────────────────────────── */}
      {tab === 'access' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Doc picker */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text2)' }}>Select Document</h3>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {docs.map(doc => (
                <button key={doc.id} onClick={() => loadDocAccess(doc)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer"
                  style={selectedDoc?.id === doc.id
                    ? { background: 'var(--accent)', color: 'var(--accent-fg)' }
                    : { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-[10px]" style={selectedDoc?.id === doc.id ? { color: 'rgba(255,255,255,0.7)' } : { color: 'var(--text3)' }}>{doc.category}</p>
                  </div>
                  {visibilityIcon(doc.visibility)}
                </button>
              ))}
              {docs.length === 0 && <p className="text-sm" style={{ color: 'var(--text3)' }}>No documents yet.</p>}
            </div>
          </div>

          {/* Access editor */}
          <div>
            {!selectedDoc ? (
              <div className="flex flex-col items-center justify-center h-40" style={{ color: 'var(--text3)' }}>
                <Shield className="w-8 h-8 mb-2" />
                <p className="text-sm">Select a document to configure access</p>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>{selectedDoc.title}</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>{selectedDoc.category}</p>

                {/* Visibility selector */}
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>Who can see this?</p>
                  <div className="grid grid-cols-1 gap-2">
                    {VISIBILITY_OPTS.map(opt => {
                      const Icon = opt.icon
                      const active = docVisibility === opt.value
                      return (
                        <button key={opt.value} onClick={() => handleVisibilityChange(opt.value)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer text-left"
                          style={active
                            ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-fg)' }
                            : { background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold">{opt.label}</p>
                            <p className="text-[10px]" style={active ? { color: 'rgba(255,255,255,0.7)' } : { color: 'var(--text3)' }}>{opt.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Team assignments (only when visibility = teams) */}
                {docVisibility === 'teams' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Team Access</p>
                      <button onClick={() => setAddingTeam(true)}
                        className="flex items-center gap-1 text-xs cursor-pointer"
                        style={{ color: 'var(--accent)' }}>
                        <Plus className="w-3 h-3" /> Add team
                      </button>
                    </div>

                    {addingTeam && (
                      <div className="flex items-center gap-2 mb-3 p-3 rounded-lg" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                        <select value={newTeamId} onChange={e => setNewTeamId(e.target.value)}
                          className="input-theme flex-1 px-3 py-1.5 rounded-lg text-xs cursor-pointer">
                          <option value="">Select team…</option>
                          {teams.filter(t => !accessRules.some(r => r.team_id === t.id)).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: 'var(--text2)' }}>
                          <input type="checkbox" checked={newRequired} onChange={e => setNewRequired(e.target.checked)} className="cursor-pointer" />
                          Required
                        </label>
                        <button onClick={handleAddTeam} disabled={!newTeamId}
                          className="px-2 py-1 rounded text-xs cursor-pointer disabled:opacity-40"
                          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>Add</button>
                        <button onClick={() => setAddingTeam(false)} style={{ color: 'var(--text3)' }}>
                          <X className="w-4 h-4 cursor-pointer" />
                        </button>
                      </div>
                    )}

                    {accessRules.length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--text3)' }}>No teams assigned — document hidden from all learners.</p>
                    ) : (
                      <div className="space-y-1">
                        {accessRules.map(rule => (
                          <div key={rule.id} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                            <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text3)' }} />
                            <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>{rule.teams?.name}</span>
                            <button onClick={() => handleToggleRequired(rule)}
                              className={`text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-colors ${rule.is_required ? 'text-amber-400 bg-amber-400/10' : 'bg-opacity-10'}`}
                              style={rule.is_required ? {} : { color: 'var(--text3)', background: 'var(--bg3)' }}>
                              {rule.is_required ? 'Required' : 'Optional'}
                            </button>
                            <button onClick={() => handleRemoveAccess(rule.id)} style={{ color: 'var(--text3)' }}>
                              <X className="w-3.5 h-3.5 cursor-pointer hover:text-red-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ACK REPORT ──────────────────────────── */}
      {tab === 'report' && (
        <div className="space-y-4">
          {report.length === 0 ? (
            <div className="flex flex-col items-center py-16" style={{ color: 'var(--text3)' }}>
              <AlertCircle className="h-10 w-10 mb-3" />
              <p className="text-sm">No required acknowledgment documents yet.</p>
            </div>
          ) : report.map(item => (
            <div key={item.document.id} className="rounded-xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{item.document.title}</h3>
                    {item.document.version > 1 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
                        v{item.document.version}
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>{item.document.category}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black" style={{ color: 'var(--text)' }}>{item.completion_pct}%</div>
                  <div className="text-xs" style={{ color: 'var(--text3)' }}>{item.acked}/{item.total_staff} staff</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--bg3)' }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${item.completion_pct}%`,
                  background: item.completion_pct === 100 ? '#10b981' : item.completion_pct > 50 ? '#6366f1' : '#f59e0b',
                }} />
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {item.acked} acknowledged</span>
                <span className="text-amber-400 flex items-center gap-1"><Users className="h-3 w-3" /> {item.pending} pending</span>
                <button
                  onClick={() => setExpandedReportDoc(expandedReportDoc === item.document.id ? null : item.document.id)}
                  className="ml-auto text-xs underline cursor-pointer"
                  style={{ color: 'var(--accent)' }}>
                  {expandedReportDoc === item.document.id ? 'Hide detail' : 'Show detail'}
                </button>
              </div>
              {expandedReportDoc === item.document.id && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th className="text-left pb-2 pr-4 font-semibold" style={{ color: 'var(--text2)' }}>Staff</th>
                        <th className="text-left pb-2 pr-4 font-semibold" style={{ color: 'var(--text2)' }}>Version</th>
                        <th className="text-left pb-2 font-semibold" style={{ color: 'var(--text2)' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.staff.map((s, i) => {
                        const isOldVersion = s.acknowledged && s.document_version !== null && s.document_version < item.document.version
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td className="py-2 pr-4" style={{ color: 'var(--text)' }}>{s.name}</td>
                            <td className="py-2 pr-4">
                              {s.acknowledged ? (
                                <span className="flex items-center gap-1">
                                  <span className="font-mono" style={{ color: isOldVersion ? '#f59e0b' : 'var(--text)' }}>
                                    {s.document_version !== null ? `v${s.document_version}` : '—'}
                                  </span>
                                  {isOldVersion && (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                                    </svg>
                                  )}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text3)' }}>—</span>
                              )}
                            </td>
                            <td className="py-2" style={{ color: s.acked_at ? 'var(--text2)' : 'var(--text3)' }}>
                              {s.acked_at ? new Date(s.acked_at).toLocaleDateString() : 'Pending'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── STORAGE ─────────────────────────────── */}
      {tab === 'storage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Documents', value: docs.length, sub: 'total files' },
              { label: 'Storage used', value: fmtBytes(totalStorage), sub: 'across all docs' },
              { label: 'Ack required', value: docs.filter(d => d.requires_ack).length, sub: 'documents' },
              { label: 'Admin only', value: docs.filter(d => d.visibility === 'admin_only').length, sub: 'hidden from staff' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl p-4" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text3)' }}>{stat.label}</p>
                <p className="text-2xl font-black mt-1" style={{ color: 'var(--text)' }}>{stat.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{stat.sub}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text2)' }}>By Category</h3>
            <div className="space-y-2">
              {CATEGORIES.filter(cat => docs.some(d => d.category === cat)).map(cat => {
                const catDocs = docs.filter(d => d.category === cat)
                const catSize = catDocs.reduce((s, d) => s + (d.file_size ?? 0), 0)
                const pct = totalStorage > 0 ? Math.round(catSize / totalStorage * 100) : 0
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-right" style={{ color: 'var(--text2)' }}>{cat}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                    </div>
                    <span className="text-xs w-24" style={{ color: 'var(--text3)' }}>{catDocs.length} doc{catDocs.length !== 1 ? 's' : ''} · {catSize > 0 ? fmtBytes(catSize) : '—'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── VERSION HISTORY SLIDE-OVER ──────────── */}
      {historyDoc && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={closeHistory} />
          <div className="fixed right-0 top-0 h-full w-96 z-50 flex flex-col overflow-hidden"
            style={{ background: 'var(--bg)', borderLeft: '1px solid var(--border)' }}>
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0 pr-3">
                <h2 className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{historyDoc.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: 'var(--text3)' }}>Current:</span>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
                    v{historyDoc.version ?? 1}
                  </span>
                </div>
              </div>
              <button onClick={closeHistory} className="p-1 rounded cursor-pointer flex-shrink-0" style={{ color: 'var(--text3)' }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Upload new version */}
              <form onSubmit={handleVersionUpload} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Upload New Version</p>
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text3)' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <label className="flex-1 cursor-pointer">
                    <input type="file" accept=".pdf" className="hidden"
                      onChange={e => setVersionFile(e.target.files?.[0] ?? null)} />
                    <span className="text-xs" style={{ color: versionFile ? 'var(--text)' : 'var(--text3)' }}>
                      {versionFile ? versionFile.name : 'Choose PDF…'}
                    </span>
                  </label>
                  {versionFile && (
                    <button type="button" onClick={() => setVersionFile(null)} style={{ color: 'var(--text3)' }}>
                      <X className="h-3.5 w-3.5 cursor-pointer" />
                    </button>
                  )}
                </div>
                <textarea
                  value={versionNotes}
                  onChange={e => setVersionNotes(e.target.value)}
                  placeholder="Change notes (optional)"
                  rows={2}
                  className="input-theme w-full px-3 py-2 rounded-xl text-xs resize-none"
                />
                <button type="submit" disabled={!versionFile || versionUploading}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                  <Upload className="h-3.5 w-3.5" />
                  {versionUploading ? 'Uploading…' : 'Publish New Version'}
                </button>
              </form>

              {/* Version history table */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text2)' }}>Version History</p>
                {versionsLoading ? (
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>Loading…</p>
                ) : versions.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>No version history yet.</p>
                ) : (
                  <div className="space-y-2">
                    {versions.map(v => (
                      <div key={v.id} className="rounded-xl p-3 space-y-1.5" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded" style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
                            v{v.version}
                          </span>
                          <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
                            {new Date(v.uploaded_at).toLocaleDateString()} {new Date(v.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs truncate" style={{ color: 'var(--text)' }}>{v.file_name}</p>
                        {v.uploader && (
                          <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
                            {v.uploader.first_name} {v.uploader.last_name} · {v.uploader.email}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px]" style={{ color: 'var(--text3)' }}>
                          {v.file_size !== null && <span>{fmtBytes(v.file_size)}</span>}
                          {v.content_hash && <span className="font-mono">{v.content_hash.slice(0, 12)}</span>}
                          <span className="flex items-center gap-0.5">
                            <CheckCircle className="h-2.5 w-2.5" style={{ color: 'var(--accent)' }} />
                            {v.ack_count} ack{v.ack_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {v.notes && <p className="text-[10px] italic" style={{ color: 'var(--text2)' }}>{v.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── COLD VAULT ──────────────────────────── */}
      {tab === 'vault' && (
        <div className="max-w-lg">
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg3)' }}>
                <Lock className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Cold Vault Download</h3>
                <p className="text-xs" style={{ color: 'var(--text3)' }}>AES-256-GCM encrypted backup</p>
              </div>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--text2)' }}>
              Downloads an encrypted <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--bg3)' }}>.vault</code> file containing all document metadata, acknowledgment records, access rules, and signed download URLs for every file. Store offline as a compliance backup.
            </p>
            <div className="rounded-xl p-4 mb-5 text-xs space-y-1.5" style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>
              <p>• Encrypted with AES-256-GCM + scrypt key derivation (VAULT_SECRET env var)</p>
              <p>• Contains metadata + ack records only — no embedded file URLs</p>
              <p>• File paths included; retrieve files via authenticated admin API after decrypting</p>
              <p>• Format: <code>.vault</code> (binary: salt(16) + IV(12) + auth tag(16) + ciphertext)</p>
              <p>• Requires VAULT_SECRET ≥ 32 chars — vault endpoint returns 503 if not set</p>
            </div>
            <button onClick={handleVaultDownload} disabled={vaultLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 cursor-pointer"
              style={{ background: 'var(--accent)' }}>
              <Download className="w-4 h-4" />
              {vaultLoading ? 'Generating vault…' : `Download Vault (${docs.length} documents)`}
            </button>
          </div>

          <div className="rounded-xl p-4 text-xs space-y-2" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text3)' }}>
            <p className="font-semibold" style={{ color: 'var(--text2)' }}>Decrypt vault locally</p>
            <pre className="overflow-x-auto p-3 rounded-lg text-[10px]" style={{ background: 'var(--bg3)' }}>{`node -e "
const {createDecipheriv,scryptSync}=require('crypto');
const fs=require('fs');
const buf=fs.readFileSync('lms-vault-YYYY-MM-DD.vault');
const salt=buf.slice(0,16), iv=buf.slice(16,28);
const tag=buf.slice(28,44), ct=buf.slice(44);
const key=scryptSync(process.env.VAULT_SECRET, salt, 32);
const d=createDecipheriv('aes-256-gcm',key,iv);
d.setAuthTag(tag);
console.log(d.update(ct)+d.final());
"`}</pre>
            <p>Set <code>VAULT_SECRET</code> to the same value used on the server.</p>
          </div>
        </div>
      )}
    </div>
  )
}
