import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const DEMO_DOCS = [
  // ── Employment & HR ──────────────────────────────────────────────────────
  {
    title: 'Employee Handbook – Master Edition',
    description: 'Comprehensive guide covering company mission, employment policies, benefits, code of conduct, performance expectations, leaves of absence, and disciplinary procedures. Updated annually.',
    category: 'HR', requires_ack: true, visibility: 'all',
  },
  {
    title: 'Code of Conduct & Ethical Standards',
    description: 'Standards for professional behavior, conflicts of interest, gift policies, antitrust compliance, and use of company assets. Includes examples of violations and consequences.',
    category: 'HR', requires_ack: true, visibility: 'all',
  },
  {
    title: 'PTO & Leave Policy',
    description: 'Vacation days, sick leave, parental leave, sabbatical, carryover rules, blackout dates, and requesting time off procedures.',
    category: 'HR', requires_ack: true, visibility: 'all',
  },
  {
    title: 'Benefits Summary & Enrollment Guide',
    description: 'Health insurance options, dental, vision, 401(k) matching, HSA eligibility, life insurance, disability coverage, and open enrollment timeline.',
    category: 'HR', requires_ack: false, visibility: 'all',
  },
  {
    title: 'Remote Work & Flexible Schedule Policy',
    description: 'Eligibility, equipment provision, home office requirements, data security expectations, communication norms, and multi-state tax considerations.',
    category: 'HR', requires_ack: true, visibility: 'all',
  },

  // ── Compliance – Healthcare ───────────────────────────────────────────────
  {
    title: 'HIPAA Privacy Notice',
    description: 'Explains how patient health information is used, shared, and protected. Includes individual rights (access, amendment, accounting of disclosures) and privacy contact information.',
    category: 'Compliance', requires_ack: true, visibility: 'all',
  },
  {
    title: 'HIPAA Employee Confidentiality Agreement',
    description: 'Employee promise to maintain confidentiality of all PHI, use minimum necessary access, report breaches immediately, and not disclose patient information outside job duties.',
    category: 'Compliance', requires_ack: true, visibility: 'all',
  },
  {
    title: 'HIPAA Breach Notification Policy',
    description: 'How to report a suspected breach, what constitutes a breach, notification timelines (10 days to patients, 60 days to regulators), documentation requirements, and remediation steps.',
    category: 'Compliance', requires_ack: true, visibility: 'all',
  },
  {
    title: 'OSHA Workplace Safety Manual',
    description: 'Mandatory OSHA compliance covering hazard reporting, PPE requirements, accident investigation, ergonomics, bloodborne pathogens, lockout/tagout, and emergency evacuation.',
    category: 'Safety', requires_ack: true, visibility: 'all',
  },
  {
    title: 'Bloodborne Pathogens Training Material',
    description: 'Exposure control plan, universal precautions, PPE requirements, sharps handling, spill procedures, medical waste disposal, post-exposure protocol, and vaccination options.',
    category: 'Safety', requires_ack: true, visibility: 'all',
  },

  // ── Compliance – Legal ────────────────────────────────────────────────────
  {
    title: 'Confidentiality & Non-Disclosure Agreement',
    description: 'Definition of confidential information, permitted uses, confidentiality term (3–5 years post-employment), return of materials upon termination, and injunctive relief clause.',
    category: 'Compliance', requires_ack: true, visibility: 'all',
  },
  {
    title: 'Anti-Corruption & FCPA Compliance Policy',
    description: 'Prohibition on bribery, kickbacks, and improper gifts. How to handle business entertainment, record-keeping requirements, and reporting mechanisms for violations.',
    category: 'Compliance', requires_ack: true, visibility: 'all',
  },
  {
    title: 'Intellectual Property Assignment Agreement',
    description: 'Work product created during employment belongs to the company. Includes exceptions for personal projects on own time with own equipment. Required at hire for all technical staff.',
    category: 'Compliance', requires_ack: true, visibility: 'all',
  },

  // ── MLM-Specific Compliance ───────────────────────────────────────────────
  {
    title: 'Distributor Agreement – Independent Contractor Terms',
    description: 'Defines distributor status (not employee), product purchase terms (no mandatory inventory), retail customer requirements, 30-day buyback policy, and termination clause.',
    category: 'Compliance', requires_ack: true, visibility: 'all',
  },
  {
    title: 'Income Disclosure Statement (FTC Mandated – 2026)',
    description: 'Actual earnings data by rank, average time to reach each level, percentage of distributors at each level, and typical vs. exceptional earner profiles. Updated annually.',
    category: 'Compliance', requires_ack: true, visibility: 'all',
  },
  {
    title: 'Prohibited Income Claims & Earnings Guidance',
    description: 'What reps can and cannot say about earnings. Prohibited lifestyle claims, required disclaimers, and examples of FTC-compliant vs. non-compliant statements. Includes 15-question assessment.',
    category: 'Compliance', requires_ack: true, visibility: 'all',
  },
  {
    title: 'Compensation Plan – Full Commission & Bonus Structure',
    description: 'How commissions are calculated, bonus thresholds, volume requirements, payout schedules, active status maintenance, tier advancement criteria, and demotion rules.',
    category: 'Product', requires_ack: true, visibility: 'all',
  },
  {
    title: 'Product Claims & Substantiation Requirements',
    description: 'All product claims must have scientific backing. Procedure for verifying claims, document retention for audits (5+ years), escalation for disputed claims, and FTC compliance summary.',
    category: 'Compliance', requires_ack: true, visibility: 'all',
  },
  {
    title: 'Retail Customer Documentation Requirements',
    description: 'Distributors must document retail customer sales. Minimum customer base for commissions, acceptable proof of sale (receipts, order records), and 5-year retention policy.',
    category: 'Operations', requires_ack: true, visibility: 'all',
  },

  // ── Operations ────────────────────────────────────────────────────────────
  {
    title: 'Data Security & Device Management SOP',
    description: 'Password policies (16+ chars, 90-day rotation), personal device restrictions, VPN requirements for remote access, USB drive encryption, and incident reporting procedures.',
    category: 'Operations', requires_ack: true, visibility: 'all',
  },
  {
    title: 'Emergency Response & Evacuation Procedures',
    description: 'Evacuation routes, assembly points, emergency contacts, floor warden roles, disabled access accommodations, post-evacuation procedures, and drill schedule.',
    category: 'Safety', requires_ack: true, visibility: 'all',
  },
  {
    title: 'New Hire Onboarding Checklist (Day 1–90)',
    description: 'Day 1–90 milestones, system access requests, required training schedule, buddy assignment, and 30/60/90-day check-in template.',
    category: 'Operations', requires_ack: false, visibility: 'all',
  },
  {
    title: 'Product Catalogue – 2026 Full Line',
    description: 'Complete product descriptions, ingredients, usage instructions, shelf life, contraindications, and approved marketing language for each SKU.',
    category: 'Product', requires_ack: false, visibility: 'all',
  },

  // ── Leadership / Confidential ─────────────────────────────────────────────
  {
    title: 'Q2 2026 Board Meeting Minutes',
    description: 'Summary of board decisions, strategic priorities, key resolutions, and follow-up actions from Q2 2026 board meeting.',
    category: 'Leadership', requires_ack: false, visibility: 'admin_only',
  },
  {
    title: '2026 Annual Strategic Plan & 3-Year Roadmap',
    description: 'Company vision, OKRs, market expansion targets, M&A considerations, budget allocation, and R&D investment priorities for fiscal year 2026.',
    category: 'Leadership', requires_ack: false, visibility: 'admin_only',
  },
]

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { count } = await supabaseAdmin
    .from('documents').select('id', { count: 'exact', head: true })
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Documents already exist. Clear library first to seed demo content.' }, { status: 409 })
  }

  const rows = DEMO_DOCS.map(d => ({
    ...d,
    file_path: `demo/${d.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)}.pdf`,
    file_name: `${d.title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50)}.pdf`,
    file_size: null,
    uploaded_by: user.id,
  }))

  const { data, error } = await supabaseAdmin
    .from('documents').insert(rows).select('id, title')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: data?.length ?? 0 })
}
