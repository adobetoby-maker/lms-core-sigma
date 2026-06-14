'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, PlayCircle, Award, Flame, Star, Trophy, BookOpen, Zap, ChevronRight } from 'lucide-react'

interface Course { id: number; title: string; description: string | null; is_active: boolean }
interface Enrollment {
  id: number
  status: string
  video_watched: boolean
  completed_at: string | null
  courses: Course
}
interface QuizAttempt {
  course_id: number
  score: number
  passed: boolean
}

interface Props {
  firstName: string
  enrollments: Enrollment[]
  attempts: QuizAttempt[]
}

const COURSE_BADGES: Record<string, { icon: string; label: string; color: string }> = {
  'hipaa':           { icon: '🔒', label: 'HIPAA Certified',       color: '#6366f1' },
  'infection':       { icon: '🧤', label: 'Infection Control',     color: '#10b981' },
  'bloodborne':      { icon: '🩸', label: 'BBP Trained',           color: '#ef4444' },
  'needlestick':     { icon: '💉', label: 'Sharps Safety',         color: '#f59e0b' },
  'patient right':   { icon: '⚖️', label: 'Patient Rights',        color: '#8b5cf6' },
  'workplace safety':{ icon: '🦺', label: 'Safety Pro',            color: '#f97316' },
  'fire':            { icon: '🔥', label: 'Fire Safety',           color: '#dc2626' },
  'mandatory':       { icon: '📋', label: 'Mandated Reporter',     color: '#0ea5e9' },
  'stark':           { icon: '⚡', label: 'Stark Law',             color: '#eab308' },
  'fraud':           { icon: '🛡️', label: 'FWA Champion',          color: '#22c55e' },
  'hazard':          { icon: '⚗️', label: 'HazCom Trained',        color: '#a855f7' },
  'airborne':        { icon: '😷', label: 'Respiratory Safety',    color: '#06b6d4' },
  'aml':             { icon: '🔍', label: 'AML Certified',         color: '#84cc16' },
  'kyc':             { icon: '📝', label: 'KYC Trained',           color: '#f43f5e' },
  'communication':   { icon: '💬', label: 'Communicator',          color: '#14b8a6' },
  'leadership':      { icon: '🏆', label: 'Leader',                color: '#f59e0b' },
  'blockchain':      { icon: '🔗', label: 'Blockchain Certified',  color: '#8b5cf6' },
  'compliance':      { icon: '✅', label: 'Compliance Champion',   color: '#10b981' },
}

const ACHIEVEMENT_BADGES = [
  { id: 'first_pass',      icon: '⭐', label: 'First Pass',       desc: 'Complete your first course',    color: '#f59e0b' },
  { id: 'perfect',         icon: '💯', label: 'Perfect Score',    desc: 'Score 100% on a quiz',           color: '#10b981' },
  { id: 'halfway',         icon: '🎯', label: 'Halfway There',    desc: 'Complete 50% of courses',        color: '#6366f1' },
  { id: 'all_clear',       icon: '🏅', label: 'All Clear',        desc: 'Complete all assigned courses',  color: '#f97316' },
  { id: 'quick_learner',   icon: '⚡', label: 'Quick Learner',    desc: 'Pass 3 courses',                 color: '#8b5cf6' },
  { id: 'compliance_star', icon: '🌟', label: 'Compliance Star',  desc: 'Pass 5 courses',                 color: '#eab308' },
]

function getBadgeForCourse(title: string) {
  const lower = title.toLowerCase()
  for (const [key, badge] of Object.entries(COURSE_BADGES)) {
    if (lower.includes(key)) return badge
  }
  return { icon: '📚', label: 'Certified', color: '#6366f1' }
}

function DonutChart({ pct, color = '#6366f1' }: { pct: number; color?: string }) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 200)
    return () => clearTimeout(t)
  }, [pct])

  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (animated / 100) * circ

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--bg)" strokeWidth="12" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="12"
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  )
}

function StreakBadge({ streak }: { streak: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div className="relative">
        <Flame className={`h-10 w-10 ${streak > 0 ? 'text-orange-400' : ''}`}
          style={{ color: streak > 0 ? '#fb923c' : 'var(--text3)' }}
          fill={streak > 0 ? '#fb923c' : 'var(--bg3)'} />
        {streak > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center px-1">
            {streak}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium" style={{ color: 'var(--text3)' }}>
        {streak > 0 ? `${streak}d streak` : 'No streak'}
      </span>
    </div>
  )
}

export function DashboardClient({ firstName, enrollments, attempts }: Props) {
  const passed     = enrollments.filter(e => e.status === 'passed')
  const inProgress = enrollments.filter(e => e.status === 'in_progress' || e.status === 'invited')
  const pct        = enrollments.length > 0 ? Math.round((passed.length / enrollments.length) * 100) : 0
  const perfectScores = attempts.filter(a => a.score === 100).length
  const avgScore      = attempts.length > 0
    ? Math.round(attempts.filter(a => a.passed).reduce((s, a) => s + a.score, 0) / Math.max(attempts.filter(a => a.passed).length, 1))
    : 0

  const xp       = passed.length * 100 + perfectScores * 50 + attempts.length * 10
  const level    = Math.floor(xp / 500) + 1
  const levelXp  = xp % 500
  const levelPct = Math.round((levelXp / 500) * 100)

  const unlockedAchievements = new Set<string>()
  if (passed.length >= 1) unlockedAchievements.add('first_pass')
  if (perfectScores >= 1) unlockedAchievements.add('perfect')
  if (pct >= 50)          unlockedAchievements.add('halfway')
  if (pct === 100 && passed.length > 0) unlockedAchievements.add('all_clear')
  if (passed.length >= 3) unlockedAchievements.add('quick_learner')
  if (passed.length >= 5) unlockedAchievements.add('compliance_star')

  const streak = passed.length > 0 ? Math.min(passed.length, 7) : 0

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

      {/* Greeting */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            {pct === 100 && passed.length > 0
              ? "🎉 All courses complete — you're fully compliant!"
              : `${inProgress.length} course${inProgress.length !== 1 ? 's' : ''} remaining`}
          </p>
        </div>
        <StreakBadge streak={streak} />
      </div>

      {/* Top row: donut + stats + XP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

        {/* Donut */}
        <div className="sm:col-span-1 card-theme rounded-2xl p-5 flex flex-col items-center justify-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text2)' }}>Overall Progress</p>
          <div className="relative">
            <DonutChart pct={pct} color={pct === 100 ? '#10b981' : 'var(--accent)'} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black" style={{ color: 'var(--text)' }}>{pct}%</span>
              <span className="text-[10px]" style={{ color: 'var(--text3)' }}>{passed.length}/{enrollments.length}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="sm:col-span-1 grid grid-rows-3 gap-3">
          {[
            { icon: CheckCircle2, color: '#10b981', label: 'Completed',     value: `${passed.length} courses` },
            { icon: Star,         color: '#eab308', label: 'Avg. Score',    value: avgScore > 0 ? `${avgScore}%` : '—' },
            { icon: Trophy,       color: '#f59e0b', label: 'Perfect Scores',value: String(perfectScores) },
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} className="card-theme rounded-xl px-4 py-3 flex items-center gap-3">
              <Icon className="h-5 w-5 flex-shrink-0" style={{ color }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--text3)' }}>{label}</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* XP / Level */}
        <div className="sm:col-span-1 rounded-2xl p-5 flex flex-col justify-between"
          style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" style={{ color: 'var(--accent)' }} fill="var(--accent)" />
              <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Level {level}</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }}>
              {xp} XP
            </span>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-1.5" style={{ color: 'var(--text3)' }}>
              <span>Progress to Level {level + 1}</span>
              <span>{levelXp}/500 XP</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${levelPct}%`, background: 'var(--accent)' }} />
            </div>
            <p className="text-[10px] mt-2" style={{ color: 'var(--text3)' }}>
              +100 XP per course · +50 XP perfect · +10 XP per attempt
            </p>
          </div>
        </div>
      </div>

      {/* Earned badges */}
      {passed.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text2)' }}>Your Badges</h2>
          <div className="flex flex-wrap gap-3">
            {passed.map(e => {
              const badge = getBadgeForCourse(e.courses?.title ?? '')
              return (
                <div key={e.id}
                  className="flex items-center gap-2.5 rounded-xl border px-3 py-2 card-theme transition-all hover:scale-105"
                  style={{ borderColor: `${badge.color}40` }}>
                  <span className="text-xl leading-none">{badge.icon}</span>
                  <div>
                    <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text)' }}>{badge.label}</p>
                    <p className="text-[10px] truncate max-w-[120px]" style={{ color: 'var(--text3)' }}>{e.courses?.title}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text2)' }}>Achievements</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {ACHIEVEMENT_BADGES.map(ach => {
            const unlocked = unlockedAchievements.has(ach.id)
            return (
              <div key={ach.id} title={ach.desc}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${unlocked ? 'hover:scale-105 cursor-default' : 'opacity-40'}`}
                style={unlocked
                  ? { borderColor: `${ach.color}40`, background: `${ach.color}10` }
                  : { borderColor: 'var(--border)', background: 'var(--bg2)' }
                }>
                <span className={`text-2xl leading-none ${unlocked ? '' : 'grayscale'}`}>
                  {unlocked ? ach.icon : '🔒'}
                </span>
                <p className="text-[10px] font-semibold text-center leading-tight"
                  style={{ color: unlocked ? ach.color : 'var(--text3)' }}>
                  {ach.label}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Course list */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text2)' }}>Your Courses</h2>

        {inProgress.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-amber-400">
              <Clock className="h-3.5 w-3.5" /> Continue Learning
            </p>
            <div className="space-y-2">
              {inProgress.map(e => (
                <Link key={e.id} href={`/course/${e.courses?.id}`}
                  className="flex items-center gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 px-4 py-3.5 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <PlayCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{e.courses?.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                      {e.video_watched ? 'Video watched — take the quiz' : 'Start with the video'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                      {e.video_watched ? 'Quiz ready' : 'In progress'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {passed.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
            </p>
            <div className="space-y-2">
              {passed.map(e => {
                const attempt = attempts.find(a => a.course_id === e.courses?.id)
                const badge   = getBadgeForCourse(e.courses?.title ?? '')
                return (
                  <Link key={e.id} href={`/certificate/${e.id}`} target="_blank"
                    className="flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 px-4 py-3.5 transition-colors group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{ background: `${badge.color}20` }}>
                      {badge.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{e.courses?.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                        {e.completed_at ? new Date(e.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Completed'}
                        {attempt && ` · ${attempt.score}% score`}
                        {attempt?.score === 100 && ' 💯'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Award className="h-2.5 w-2.5" /> Certificate
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {enrollments.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <BookOpen className="h-12 w-12 mb-3" style={{ color: 'var(--text3)' }} />
            <p style={{ color: 'var(--text2)' }}>No courses assigned yet.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>Your administrator will enroll you in required training.</p>
          </div>
        )}
      </div>
    </main>
  )
}
