import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { CertActions } from './CertActions'
import brand from '@/lib/brand'

interface Props {
  params: Promise<{ enrollmentId: string }>
}

export default async function CertificatePage({ params }: Props) {
  const { enrollmentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/certificate/${enrollmentId}`)

  const { data: enrollment } = await supabaseAdmin
    .from('enrollments')
    .select(`id, completed_at, status, user_id, courses(title, description), profiles(full_name)`)
    .eq('id', enrollmentId)
    .eq('status', 'passed')
    .single()

  if (!enrollment || !enrollment.completed_at) return notFound()

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()

  const isOwner = enrollment.user_id === user.id
  const isAdmin = !!profile?.is_admin
  if (!isOwner && !isAdmin) return notFound()

  const course = enrollment.courses as unknown as { title: string; description: string }
  const learnerProfile = enrollment.profiles as unknown as { full_name: string }
  const completedDate = new Date(enrollment.completed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const recipientName = learnerProfile?.full_name || 'Learner'
  const certId = `LC-${enrollmentId.slice(0, 8).toUpperCase()}`

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0a0a18; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'Georgia','Times New Roman',serif; }
        .cert-wrapper { padding: 40px 20px; width: 100%; display: flex; justify-content: center; }
        .cert { width: 900px; min-height: 640px; background: #fff; position: relative; padding: 60px 70px; overflow: hidden; }
        .cert::before { content: ''; position: absolute; inset: 14px; border: 2px solid #4f46e5; pointer-events: none; }
        .cert::after  { content: ''; position: absolute; inset: 18px; border: 0.5px solid rgba(79,70,229,0.3); pointer-events: none; }
        .corner { position: absolute; width: 48px; height: 48px; }
        .corner-tl { top: 8px; left: 8px; }
        .corner-tr { top: 8px; right: 8px; transform: scaleX(-1); }
        .corner-bl { bottom: 8px; left: 8px; transform: scaleY(-1); }
        .corner-br { bottom: 8px; right: 8px; transform: scale(-1); }
        .cert-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 36px; }
        .logo-area { display: flex; align-items: center; gap: 12px; }
        .logo-text { font-family: system-ui; font-weight: 800; font-size: 22px; color: #1e1b4b; letter-spacing: -0.02em; }
        .logo-sub { font-family: system-ui; font-size: 10px; color: #4f46e5; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 600; }
        .cert-type { font-family: system-ui; font-size: 10px; letter-spacing: 0.25em; text-transform: uppercase; color: #4f46e5; font-weight: 700; text-align: right; }
        .divider { height: 1px; background: linear-gradient(to right, transparent, #4f46e5, transparent); margin: 0 0 32px; }
        .cert-title { text-align: center; margin-bottom: 6px; font-size: 13px; letter-spacing: 0.3em; text-transform: uppercase; color: #555; font-family: system-ui; font-weight: 500; }
        .cert-declares { text-align: center; font-size: 13px; color: #888; margin-bottom: 20px; font-family: system-ui; }
        .recipient { text-align: center; font-size: 48px; color: #1e1b4b; font-style: italic; margin-bottom: 20px; letter-spacing: 0.02em; line-height: 1.1; }
        .cert-body { text-align: center; font-size: 14px; color: #444; line-height: 1.8; margin-bottom: 32px; font-family: system-ui; }
        .course-name { display: block; font-size: 22px; font-weight: 700; color: #1e1b4b; font-family: 'Georgia',serif; font-style: italic; margin: 8px 0; }
        .cert-footer { display: flex; align-items: flex-end; justify-content: space-between; margin-top: 40px; }
        .sig-block { text-align: center; min-width: 160px; }
        .sig-line { width: 160px; height: 1px; background: #333; margin: 0 auto 6px; }
        .sig-name { font-size: 12px; font-weight: 700; color: #1e1b4b; font-family: system-ui; }
        .sig-title { font-size: 10px; color: #888; font-family: system-ui; letter-spacing: 0.1em; }
        .seal-area { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .cert-id { font-size: 9px; color: #bbb; font-family: system-ui; letter-spacing: 0.12em; text-align: center; }
        .date-block { text-align: center; min-width: 160px; }
        .date-label { font-size: 10px; color: #888; letter-spacing: 0.15em; text-transform: uppercase; font-family: system-ui; margin-bottom: 4px; }
        .date-value { font-size: 14px; color: #1e1b4b; font-family: system-ui; font-weight: 600; }
        @media print {
          body { background: white; }
          .cert-wrapper { padding: 0; }
          .cert { width: 100%; min-height: 100vh; box-shadow: none; }
          @page { size: landscape; margin: 0; }
        }
      `}</style>

      <CertActions />

      <div className="cert-wrapper">
        <div className="cert">
          {/* Corner ornaments */}
          {(['corner corner-tl','corner corner-tr','corner corner-bl','corner corner-br'] as const).map((c, i) => (
            <svg key={i} className={c} viewBox="0 0 48 48" fill="none">
              <path d="M4 44 L4 4 L44 4" stroke="#4f46e5" strokeWidth="2" fill="none"/>
              <circle cx="4" cy="4" r="3" fill="#4f46e5"/>
            </svg>
          ))}

          {/* Header */}
          <div className="cert-header">
            <div className="logo-area">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="23" stroke="#4f46e5" strokeWidth="1.5"/>
                <path d="M14 16 L24 32 L34 16" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19 16 L24 26 L29 16" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <div className="logo-text">{brand.company.toUpperCase()}</div>
                <div className="logo-sub">Professional Compliance Training</div>
              </div>
            </div>
            <div className="cert-type">Certificate of<br/>Completion</div>
          </div>

          <div className="divider" />

          <div className="cert-title">This certifies that</div>
          <div className="recipient">{recipientName}</div>

          <div className="cert-body">
            has successfully completed the required coursework and assessment for
            <span className="course-name">{course.title}</span>
            demonstrating proficiency in compliance knowledge as required by<br/>
            {brand.company}&apos;s professional training standards.
          </div>

          <div className="cert-footer">
            <div className="sig-block">
              <div className="sig-line" />
              <div className="sig-name">{brand.company}</div>
              <div className="sig-title">Authorized Signatory</div>
            </div>

            <div className="seal-area">
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="47" stroke="#4f46e5" strokeWidth="1.5" strokeDasharray="4 2"/>
                <circle cx="50" cy="50" r="40" stroke="#4f46e5" strokeWidth="0.75"/>
                <circle cx="50" cy="50" r="39" fill="rgba(79,70,229,0.04)"/>
                <path d="M32 36 L50 66 L68 36" stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M38 36 L50 58 L62 36" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <text fill="#4f46e5" fontSize="7" fontFamily="system-ui" fontWeight="700" letterSpacing="2">
                  <textPath href="#topArc">LMS CORE · CERTIFIED ·</textPath>
                </text>
                <path id="topArc" d="M 15,50 A 35,35 0 0,1 85,50" fill="none"/>
                <text fill="#4f46e5" fontSize="6.5" fontFamily="system-ui" fontWeight="600" letterSpacing="1.5">
                  <textPath href="#botArc">PROFESSIONAL COMPLIANCE</textPath>
                </text>
                <path id="botArc" d="M 18,55 A 35,35 0 0,0 82,55" fill="none"/>
              </svg>
              <div className="cert-id">ID: {certId}</div>
            </div>

            <div className="date-block">
              <div className="date-label">Date Issued</div>
              <div className="date-value">{completedDate}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
