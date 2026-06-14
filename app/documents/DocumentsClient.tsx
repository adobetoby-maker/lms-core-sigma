'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Download, CheckCircle, Clock, Search, ChevronDown } from 'lucide-react'

interface Doc {
  id: string
  title: string
  description: string | null
  category: string
  file_name: string
  file_size: number | null
  requires_ack: boolean
  created_at: string
  acknowledged: boolean
}

const CATEGORIES = ['All', 'HR', 'Compliance', 'Safety', 'Clinical', 'Policy', 'General']

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsClient() {
  const [docs, setDocs]       = useState<Doc[]>([])
  const [search, setSearch]   = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [ackingId, setAckingId] = useState<string | null>(null)

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/documents')
    const data = await res.json() as { documents: Doc[] }
    setDocs(data.documents ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleAck = async (id: string) => {
    setAckingId(id)
    await fetch('/api/documents/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: id }),
    })
    setDocs(prev => prev.map(d => d.id === id ? { ...d, acknowledged: true } : d))
    setAckingId(null)
  }

  const filtered = docs.filter(d => {
    const matchesSearch = !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase()) ||
      d.file_name.toLowerCase().includes(search.toLowerCase())
    const matchesCat = category === 'All' || d.category === category
    return matchesSearch && matchesCat
  })

  const grouped = filtered.reduce<Record<string, Doc[]>>((acc, d) => {
    acc[d.category] = acc[d.category] ?? []
    acc[d.category].push(d)
    return acc
  }, {})

  const pendingAcks = docs.filter(d => d.requires_ack && !d.acknowledged).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Document Library</h1>
        <p className="text-sm" style={{ color: 'var(--text2)' }}>Policies, handbooks, SDS sheets, and reference documents.</p>
      </div>

      {pendingAcks > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            <strong>{pendingAcks} document{pendingAcks > 1 ? 's' : ''}</strong> require your acknowledgment.
          </p>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text3)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="input-theme w-full pl-9 pr-4 py-2.5 rounded-xl text-sm" />
        </div>
        <div className="relative">
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="input-theme appearance-none pl-4 pr-8 py-2.5 rounded-xl text-sm cursor-pointer">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--text3)' }} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--text3)' }}>Loading documents…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-10 w-10 mb-3" style={{ color: 'var(--text3)' }} />
          <p className="text-sm" style={{ color: 'var(--text2)' }}>No documents found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, catDocs]) => (
            <div key={cat}>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--text3)' }}>{cat}</h2>
              <div className="space-y-2">
                {catDocs.map(doc => (
                  <div key={doc.id}
                    className={`flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors ${
                      doc.requires_ack && !doc.acknowledged
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : ''
                    }`}
                    style={doc.requires_ack && !doc.acknowledged ? {} : { borderColor: 'var(--border)', background: 'var(--bg2)' }}
                  >
                    <FileText className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--text3)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{doc.title}</span>
                        {doc.requires_ack && (
                          doc.acknowledged
                            ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                                <CheckCircle className="h-3 w-3" /> Acknowledged
                              </span>
                            : <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Action required</span>
                        )}
                      </div>
                      {doc.description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text3)' }}>{doc.description}</p>}
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                        {doc.file_name}{doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={`/api/documents/download?id=${doc.id}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                      {doc.requires_ack && !doc.acknowledged && (
                        <button onClick={() => handleAck(doc.id)} disabled={ackingId === doc.id}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-3 py-1.5 text-xs font-bold text-white transition-colors">
                          <CheckCircle className="h-3.5 w-3.5" />
                          {ackingId === doc.id ? 'Saving…' : 'I have read this'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
