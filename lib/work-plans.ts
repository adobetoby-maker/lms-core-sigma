export const DELAY_PRESETS = [
  { label: 'Immediately (Day 0)',  days: 0   },
  { label: '1 week',              days: 7   },
  { label: '2 weeks',             days: 14  },
  { label: '1 month',             days: 30  },
  { label: '3 months',            days: 90  },
  { label: '6 months',            days: 180 },
  { label: '1 year',              days: 365 },
] as const

export function delayLabel(days: number): string {
  const preset = DELAY_PRESETS.find(p => p.days === days)
  if (preset) return preset.label
  if (days === 1) return '1 day'
  if (days < 7)  return `${days} days`
  if (days < 30) return `${Math.round(days / 7)} weeks`
  if (days < 365) return `${Math.round(days / 30)} months`
  return `${Math.round(days / 365)} years`
}

export interface WorkPlan {
  id: number
  name: string
  description: string | null
  created_at: string
  block_count?: number
  assignment_count?: number
}

export interface WorkPlanBlock {
  id: number
  plan_id: number
  name: string
  delay_days: number
  sort_order: number
  courses?: WorkPlanBlockCourse[]
}

export interface WorkPlanBlockCourse {
  id: number
  block_id: number
  course_id: number
  sort_order: number
  courses?: { id: number; title: string; is_active: boolean }
}

export interface WorkPlanAssignment {
  id: number
  plan_id: number
  team_id: number | null
  user_id: string | null
  start_date: string
  teams?: { id: number; name: string } | null
}
