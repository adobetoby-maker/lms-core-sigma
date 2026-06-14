'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Play, Plus, Check, ChevronDown } from 'lucide-react'

interface LibraryVideo {
  id: string
  title: string
  youtube_id: string
  channel: string
  thumbnail: string | null
  topics: string[]
  industries: string[]
}

interface Props {
  courseId: number
  onClose: () => void
  onAdded: () => void
}

const TOPIC_LABELS: Record<string, string> = {
  fraud_waste_abuse:    'Fraud, Waste & Abuse',
  hipaa:                'HIPAA',
  infection_control:    'Infection Control',
  bloodborne_pathogens: 'Bloodborne Pathogens',
  needlestick:          'Needlestick',
  airborne_precautions: 'Airborne/Respiratory',
  workplace_safety:     'Workplace Safety',
  patient_rights:       'Patient Rights',
  mandatory_reporter:   'Mandatory Reporter',
  stark_law:            'Stark Law',
  anti_kickback:        'Anti-Kickback',
  gifts_gratuities:     'Gifts & Gratuities',
  fire_safety:          'Fire Safety',
  compliance:           'Compliance',
  code_of_conduct:      'Code of Conduct',
  sexual_harassment:    'Sexual Harassment',
  documentation:        'Documentation',
  aml:                  'AML/KYC',
  professional_development: 'Professional Development',
  communication:        'Communication',
}

export function VideoLibraryPicker({ courseId, onClose, onAdded }: Props) {
  const [videos, setVideos]   = useState<LibraryVideo[]>([])
  const [search, setSearch]   = useState('')
  const [topic, setTopic]     = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]   = useState<string | null>(null)
  const [added, setAdded]     = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (topic) params.set('topic', topic)
    const res = await window.fetch(`/api/video-library?${params}`)
    const data = await res.json() as { videos: LibraryVideo[] }
    setVideos(data.videos ?? [])
    setLoading(false)
  }, [search, topic])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const handleAdd = async (videoId: string) => {
    setAdding(videoId)
    await window.fetch('/api/video-library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, video_id: videoId }),
    })
    setAdded(prev => new Set([...prev, videoId]))
    setAdding(null)
    onAdded()
  }

  const grouped = videos.reduce<Record<string, LibraryVideo[]>>((acc, v) => {
    acc[v.channel] = acc[v.channel] ?? []
    acc[v.channel].push(v)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl"
        style={{ background: '#0d0d1a', border: '1px solid #2a2a4a' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1e1e3a' }}>
          <div>
            <h2 className="font-bold text-white text-lg">Video Library</h2>
            <p className="text-xs text-slate-500 mt-0.5">Browse free compliance videos from CDC, OSHA, HHS OIG, WHO, and more.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 px-5 py-3" style={{ borderBottom: '1px solid #1e1e3a' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search videos…"
              className="w-full pl-9 pr-4 py-2 rounded-xl text-slate-200 text-sm placeholder:text-slate-600 outline-none transition-colors"
              style={{ background: '#0a0a18', border: '1px solid #2a2a4a' }} />
          </div>
          <div className="relative">
            <select value={topic} onChange={e => setTopic(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-slate-300 text-sm outline-none transition-colors cursor-pointer"
              style={{ background: '#0a0a18', border: '1px solid #2a2a4a' }}>
              <option value="">All Topics</option>
              {Object.entries(TOPIC_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Video grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm">Loading…</div>
          ) : videos.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm">No videos found.</div>
          ) : Object.entries(grouped).map(([channel, vids]) => (
            <div key={channel}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 px-1">{channel}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {vids.map(v => (
                  <div key={v.id}
                    className="relative rounded-xl overflow-hidden transition-all"
                    style={{
                      border: added.has(v.id) ? '1px solid rgba(16,185,129,0.4)' : '1px solid #1e1e3a',
                      background: added.has(v.id) ? 'rgba(16,185,129,0.05)' : '#0a0a18',
                    }}>

                    <div className="relative aspect-video bg-slate-900 cursor-pointer group"
                      onClick={() => setPreview(preview === v.youtube_id ? null : v.youtube_id)}>
                      {v.thumbnail ? (
                        <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div className="w-full h-full bg-slate-800" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-8 w-8 text-white" fill="white" />
                      </div>
                    </div>

                    {preview === v.youtube_id && (
                      <div className="aspect-video">
                        <iframe
                          src={`https://www.youtube.com/embed/${v.youtube_id}?autoplay=1`}
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    )}

                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-white leading-snug line-clamp-2 mb-2">{v.title}</p>
                      <div className="flex gap-1 flex-wrap mb-2">
                        {v.topics.slice(0, 2).map(t => (
                          <span key={t} className="text-[9px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded-full">
                            {TOPIC_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => handleAdd(v.id)}
                        disabled={adding === v.id || added.has(v.id)}
                        className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          added.has(v.id)
                            ? 'bg-emerald-600/20 text-emerald-400 cursor-default'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50'
                        }`}>
                        {added.has(v.id) ? (
                          <><Check className="h-3 w-3" /> Added</>
                        ) : adding === v.id ? (
                          'Adding…'
                        ) : (
                          <><Plus className="h-3 w-3" /> Add to Course</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #1e1e3a' }}>
          <p className="text-xs text-slate-500">{videos.length} videos · {added.size} added this session</p>
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-slate-300 text-sm hover:text-white transition-colors cursor-pointer"
            style={{ background: '#1a1a2e' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
