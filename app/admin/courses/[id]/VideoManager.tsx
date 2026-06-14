'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Video, Trash2, Loader2, Clock, Upload, Film, MonitorPlay,
  CheckCircle2, AlertCircle, X, CloudUpload, Library,
} from 'lucide-react'
import { VideoLibraryPicker } from '@/components/VideoLibraryPicker'

// ─── Types ──────────────────────────────────────────────────────────────────

type VideoType = 'youtube' | 'vimeo' | 'upload' | 'library'

interface VideoItem {
  id: number
  title: string
  url: string
  duration_seconds: number
  sort_order: number
}

interface Props {
  courseId: number
  videos: VideoItem[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function extractYouTubeId(input: string): string | null {
  // Handles: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID, bare IDs
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ]
  for (const re of patterns) {
    const m = input.match(re)
    if (m) return m[1]
  }
  return null
}

function extractVimeoId(input: string): string | null {
  const m = input.match(/(?:vimeo\.com\/)(\d+)/)
  return m ? m[1] : null
}

function videoTypeBadge(url: string) {
  if (url.includes('youtube.com/embed/')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25">
        <Film className="w-3 h-3" />
        YouTube
      </span>
    )
  }
  if (url.includes('player.vimeo.com/')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/25">
        <MonitorPlay className="w-3 h-3" />
        Vimeo
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
      <CloudUpload className="w-3 h-3" />
      Upload
    </span>
  )
}

// ─── Tab button ──────────────────────────────────────────────────────────────

function TabBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-400 hover:text-white hover:bg-[#1a1a2e]'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function VideoManager({ courseId, videos }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [activeTab, setActiveTab] = useState<VideoType>('youtube')

  // Shared
  const [title, setTitle] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // YouTube
  const [ytInput, setYtInput] = useState('')
  const [ytId, setYtId] = useState<string | null>(null)

  // Vimeo
  const [vimeoInput, setVimeoInput] = useState('')
  const [vimeoId, setVimeoId] = useState<string | null>(null)

  // Upload
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setTitle('')
    setDurationMinutes('')
    setError(null)
    setYtInput('')
    setYtId(null)
    setVimeoInput('')
    setVimeoId(null)
    setSelectedFile(null)
    setUploadProgress(0)
  }

  function handleYtChange(val: string) {
    setYtInput(val)
    const id = extractYouTubeId(val.trim())
    setYtId(id)
  }

  function handleVimeoChange(val: string) {
    setVimeoInput(val)
    const id = extractVimeoId(val.trim())
    setVimeoId(id)
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && /\.(mp4|mov|webm)$/i.test(file.name)) {
      setSelectedFile(file)
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    } else {
      setError('Only .mp4, .mov, or .webm files are supported.')
    }
  }, [title])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Video title is required.')
      return
    }

    const durationSecs = Math.round((parseFloat(durationMinutes) || 0) * 60)
    const nextOrder = videos.length > 0 ? Math.max(...videos.map(v => v.sort_order)) + 1 : 0
    const supabase = createClient()
    let embedUrl = ''

    setLoading(true)

    try {
      if (activeTab === 'youtube') {
        if (!ytId) { setError('Could not extract a YouTube video ID from that URL.'); setLoading(false); return }
        embedUrl = `https://www.youtube.com/embed/${ytId}`
      } else if (activeTab === 'vimeo') {
        if (!vimeoId) { setError('Could not extract a Vimeo video ID from that URL.'); setLoading(false); return }
        embedUrl = `https://player.vimeo.com/video/${vimeoId}`
      } else {
        // Upload tab
        if (!selectedFile) { setError('Please select a video file to upload.'); setLoading(false); return }

        const filePath = `${courseId}/${Date.now()}-${selectedFile.name.replace(/\s+/g, '_')}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('course-videos')
          .upload(filePath, selectedFile, {
            upsert: false,
            // @ts-expect-error — onUploadProgress exists in supabase-js v2 but may not be typed
            onUploadProgress: (progress: { loaded: number; total: number }) => {
              setUploadProgress(Math.round((progress.loaded / progress.total) * 100))
            },
          })

        if (uploadError || !uploadData) {
          setError(uploadError?.message ?? 'Upload failed.')
          setLoading(false)
          return
        }

        embedUrl = supabase.storage.from('course-videos').getPublicUrl(uploadData.path).data.publicUrl
      }

      const { error: insertError } = await supabase
        .from('videos')
        .insert({
          course_id: courseId,
          title: title.trim(),
          url: embedUrl,
          duration_seconds: durationSecs,
          sort_order: nextOrder,
        })

      if (insertError) {
        setError(insertError.message)
      } else {
        resetForm()
        setShowForm(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(videoId: number) {
    if (!confirm('Delete this video?')) return
    setDeletingId(videoId)
    const supabase = createClient()
    await supabase.from('videos').delete().eq('id', videoId)
    router.refresh()
    setDeletingId(null)
  }

  return (
    <>
    {showLibrary && (
      <VideoLibraryPicker
        courseId={courseId}
        onClose={() => setShowLibrary(false)}
        onAdded={() => { router.refresh() }}
      />
    )}
    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-indigo-400" />
          Videos
          <span className="text-sm font-normal text-slate-400">({videos.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLibrary(true)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <Library className="w-4 h-4" />
            Library
          </button>
          <button
            onClick={() => { setShowForm(v => !v); if (showForm) resetForm() }}
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            {showForm ? <X className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add Video'}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-[#0a0a18] border border-[#2a2a4a] rounded-xl p-5 mb-5 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#1a1a2e] rounded-lg p-1">
            <TabBtn active={activeTab === 'youtube'} onClick={() => { setActiveTab('youtube'); setError(null) }}>
              <Film className="w-3.5 h-3.5" />
              YouTube
            </TabBtn>
            <TabBtn active={activeTab === 'vimeo'} onClick={() => { setActiveTab('vimeo'); setError(null) }}>
              <MonitorPlay className="w-3.5 h-3.5" />
              Vimeo
            </TabBtn>
            <TabBtn active={activeTab === 'upload'} onClick={() => { setActiveTab('upload'); setError(null) }}>
              <Upload className="w-3.5 h-3.5" />
              Upload
            </TabBtn>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* YouTube tab */}
          {activeTab === 'youtube' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">YouTube URL</label>
                <input
                  type="text"
                  value={ytInput}
                  onChange={e => handleYtChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                  className="w-full bg-[#0a0a18] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                />
                {ytId && (
                  <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Video ID detected: {ytId}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Vimeo tab */}
          {activeTab === 'vimeo' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Vimeo URL</label>
                <input
                  type="text"
                  value={vimeoInput}
                  onChange={e => handleVimeoChange(e.target.value)}
                  placeholder="https://vimeo.com/123456789"
                  className="w-full bg-[#0a0a18] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                />
                {vimeoId && (
                  <p className="mt-1 text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Vimeo ID detected: {vimeoId}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Upload tab */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-[#2a2a4a] hover:border-indigo-500/50 hover:bg-indigo-500/5'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={handleFileInput}
                />
                {selectedFile ? (
                  <div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-white text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-slate-500 text-xs mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setSelectedFile(null); setUploadProgress(0) }}
                      className="mt-2 text-xs text-slate-500 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-300 text-sm font-medium">Drop a video file here</p>
                    <p className="text-slate-500 text-xs mt-1">or click to browse — .mp4, .mov, .webm</p>
                  </>
                )}
              </div>

              {loading && uploadProgress > 0 && uploadProgress < 100 && (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Uploading…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#2a2a4a] rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shared fields */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Video Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Introduction to the Course"
              className="w-full bg-[#0a0a18] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Duration <span className="text-slate-600">(minutes, optional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={durationMinutes}
              onChange={e => setDurationMinutes(e.target.value)}
              placeholder="e.g. 14.5"
              className="w-full bg-[#0a0a18] border border-[#2a2a4a] rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-slate-600"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm() }}
              className="flex-1 bg-transparent border border-[#2a2a4a] hover:border-slate-500 text-slate-400 text-sm py-2.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {loading
                ? activeTab === 'upload' ? 'Uploading…' : 'Adding…'
                : 'Add Video'}
            </button>
          </div>
        </form>
      )}

      {/* Video list */}
      {videos.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          No videos yet. Add the first one above.
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((video, i) => (
            <div
              key={video.id}
              className="flex items-center gap-3 bg-[#0a0a18] border border-[#2a2a4a] rounded-lg px-4 py-3"
            >
              <span className="text-xs font-bold text-indigo-400 w-5 text-center shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-white text-sm font-medium truncate">{video.title}</p>
                <div className="flex items-center gap-2">
                  {videoTypeBadge(video.url)}
                </div>
              </div>
              {video.duration_seconds > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatDuration(video.duration_seconds)}
                </div>
              )}
              <button
                onClick={() => handleDelete(video.id)}
                disabled={deletingId === video.id}
                className="shrink-0 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                title="Delete video"
              >
                {deletingId === video.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Trash2 className="w-4 h-4" />
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  )
}
