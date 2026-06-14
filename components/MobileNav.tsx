'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Settings, ShieldCheck, Users, LayoutDashboard, BookOpen, CheckSquare, FileText, ClipboardList } from 'lucide-react'

interface NavItem { href: string; label: string; icon: React.ReactNode }

interface Props {
  isAdmin: boolean
  currentPath?: string
}

const ADMIN_LINKS: NavItem[] = [
  { href: '/admin',              label: 'Admin',       icon: <Settings className="w-4 h-4" /> },
  { href: '/admin/courses',      label: 'Courses',     icon: <BookOpen className="w-4 h-4" /> },
  { href: '/admin/completions',  label: 'Completions', icon: <CheckSquare className="w-4 h-4" /> },
  { href: '/admin/learners',     label: 'Learners',    icon: <Users className="w-4 h-4" /> },
  { href: '/admin/compliance',   label: 'Compliance',  icon: <ShieldCheck className="w-4 h-4" /> },
  { href: '/admin/documents',    label: 'Documents',   icon: <FileText className="w-4 h-4" /> },
  { href: '/admin/surveys',      label: 'Surveys',     icon: <ClipboardList className="w-4 h-4" /> },
]

const LEARNER_LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { href: '/surveys',   label: 'Surveys',   icon: <ClipboardList className="w-4 h-4" /> },
]

export default function MobileNav({ isAdmin }: Props) {
  const [open, setOpen] = useState(false)
  const links = isAdmin ? ADMIN_LINKS : LEARNER_LINKS

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-lg cursor-pointer transition-colors"
        style={{ color: 'var(--text2)', background: open ? 'var(--bg3)' : 'transparent' }}
        aria-label="Toggle navigation"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-50 px-4 py-3 shadow-xl"
          style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}
        >
          {links.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors"
              style={{ color: 'var(--text2)' }}
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
