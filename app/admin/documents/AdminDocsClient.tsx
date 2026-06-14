'use client'

import { useState, useEffect, useCallback } from 'react'
import { Upload, Trash2, FileText, CheckCircle, Users, AlertCircle } from 'lucide-react'

interface Doc {
  id: string
  title: string
  category: string
  file_name: string
  requires_ack: boolean
  created_at: string
}

interface ReportDoc {
  document: { id: string; title: string; category: string }
  total_staff: number
  acked: number
  pending: number
  completion_pct: number
}

const CATEGORIES = ['HR', 'Compliance', 'Safety', 'Clinical', 'Policy', 'General']

export function AdminDocsClient() {
  const [docs, setDocs]     = useState<Doc[]>([])
  const [report, setReport] = useState<ReportDoc[]>([])
  const [tab, setTab]       = useState<'library' | 'upload' | 'report'>('library')
  const [uploading, setUploading] = useState(false)
  const [form, setForm]     = useState({ title: '', description: '', category: 'HR', requires_ack: false })
  const [file, setFile]     = useState<File | null>(null)
  const [success, setSuccess] = useState('')

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

  useEffect(() => { fetchDocs() }, [fetchDocs])
  useEffect(() => { if (tab === 'report') fetchReport() }, [tab, fetchReport])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !form.title) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', form.title)
    fd.append('description', form.description)
    fd.append('category', form.category)
    fd.append('requires_ack', String(form.requires_ack))
    const res = await fetch('/api/documents', { method: 'POST', body: fd })
    if (res.ok) {
      setSuccess('Document uploaded successfully.')
      setForm({ title: '', description: '', category: 'HR', requires_ack: false })
      setFile(null)
      fetchDocs()
      setTimeout(() => setSuccess(''), 3000)
    }
    setUploading(false)
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    await fetch('/api/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Document Library</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>Upload policies, handbooks, SDS sheets. Mark documents for staff acknowledgment.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-xl p-1 w-fit card-theme">
        {(['library', 'upload', 'report'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize cursor-pointer ${
              tab === t ? 'bg-indigo-600 text-white' : ''
            }`}
            style={tab === t ? {} : { color: 'var(--text2)' }}>
            {t === 'report' ? 'Acknowledgment Report' : t}
          </button>
        ))}
      </div>

      {/* Library tab */}
      {tab === 'library' && (
        <div className="space-y-2">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center py-16" style={{ color: 'var(--text3)' }}>
              <FileText className="h-10 w-10 mb-3" />
              <p className="text-sm">No documents uploaded yet.</p>
              <button onClick={() => setTab('upload')} className="mt-3 text-indigo-400 text-sm underline cursor-pointer">
                Upload first document →
              </button>
            </div>
          ) : docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-4 rounded-xl border px-4 py-3 card-theme" style={{ borderColor: 'var(--border)' }}>
              <FileText className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--text3)' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{doc.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--text3)', background: 'var(--bg3)' }}>{doc.category}</span>
                  {doc.requires_ack && <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Requires ack</span>}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{doc.file_name}</p>
              </div>
              <button onClick={() => handleDelete(doc.id, doc.title)} className="p-1 transition-colors cursor-pointer hover:text-red-400" style={{ color: 'var(--text3)' }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload tab */}
      {tab === 'upload' && (
        <form onSubmit={handleUpload} className="space-y-4 max-w-lg">
          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" /> {success}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>Document Title *</label>
            <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="2026 Employee Handbook"
              className="input-theme w-full px-4 py-3 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>Description</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Annual staff handbook — all employees must read and acknowledge"
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
            <div className="relative flex items-center justify-center rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors"
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
                  <p className="text-xs" style={{ color: 'var(--text3)' }}>Employee handbooks, policies, SDS sheets</p>
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
              <p className="text-xs" style={{ color: 'var(--text3)' }}>Staff must click "I have read this" — tracked with timestamp</p>
            </div>
          </label>
          <button type="submit" disabled={uploading || !file || !form.title}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-3 text-sm font-bold text-white transition-colors">
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : 'Upload Document'}
          </button>
        </form>
      )}

      {/* Report tab */}
      {tab === 'report' && (
        <div className="space-y-4">
          {report.length === 0 ? (
            <div className="flex flex-col items-center py-16" style={{ color: 'var(--text3)' }}>
              <AlertCircle className="h-10 w-10 mb-3" />
              <p className="text-sm">No required acknowledgment documents yet.</p>
            </div>
          ) : report.map(item => (
            <div key={item.document.id} className="rounded-xl border p-5 card-theme" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{item.document.title}</h3>
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
              <div className="flex gap-4 text-xs">
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {item.acked} acknowledged</span>
                <span className="text-amber-400 flex items-center gap-1"><Users className="h-3 w-3" /> {item.pending} pending</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
