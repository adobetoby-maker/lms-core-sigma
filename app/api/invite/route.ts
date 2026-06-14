import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM ?? 'LMS Platform <noreply@worker-bee.app>'
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lms-vericore.vercel.app'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { email, courseId } = await request.json()
  if (!email || !courseId) return Response.json({ error: 'email and courseId are required' }, { status: 400 })

  const { data: course } = await supabaseAdmin.from('courses').select('id, title').eq('id', courseId).single()
  if (!course) return Response.json({ error: 'Course not found' }, { status: 404 })

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('invites')
    .insert({ course_id: courseId, email: email.toLowerCase().trim() })
    .select('token')
    .single()

  if (inviteError || !invite) return Response.json({ error: 'Failed to create invite' }, { status: 500 })

  const inviteUrl = `${SITE}/register/${invite.token}`

  // Send email
  const { error: emailError } = await resend.emails.send({
    from: FROM,
    to: email.toLowerCase().trim(),
    subject: `You've been invited to: ${course.title}`,
    html: inviteEmail({ courseTitle: course.title, inviteUrl }),
  })

  if (emailError) {
    console.error('Email send failed:', emailError)
    // Still return the URL even if email fails — admin can share manually
    return Response.json({ inviteUrl, token: invite.token, emailSent: false, emailError: emailError.message })
  }

  return Response.json({ inviteUrl, token: invite.token, emailSent: true })
}

function inviteEmail({ courseTitle, inviteUrl }: { courseTitle: string; inviteUrl: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a18;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="padding-bottom:32px;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:10px;background:#1a1a2e;border:1px solid #2a2a4a;border-radius:12px;padding:12px 20px">
            <div style="width:32px;height:32px;background:#4f46e5;border-radius:8px;display:inline-block"></div>
            <span style="font-size:20px;font-weight:700;color:#ffffff">LMS Portal</span>
          </div>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#1a1a2e;border:1px solid #2a2a4a;border-radius:16px;padding:40px">

          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff">
            You've been invited to a training course
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6">
            An administrator has enrolled you in the following course:
          </p>

          <!-- Course name -->
          <div style="background:#0a0a18;border:1px solid #2a2a4a;border-radius:12px;padding:20px;margin-bottom:28px">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin-bottom:6px">Course</div>
            <div style="font-size:18px;font-weight:600;color:#ffffff">${courseTitle}</div>
          </div>

          <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
            Click the button below to create your account and start your training. This link expires in 7 days.
          </p>

          <!-- CTA -->
          <div style="text-align:center;margin-bottom:28px">
            <a href="${inviteUrl}"
               style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px">
              Accept Invitation &amp; Register
            </a>
          </div>

          <!-- Fallback URL -->
          <p style="margin:0;font-size:12px;color:#475569;text-align:center">
            Or copy this link:<br>
            <a href="${inviteUrl}" style="color:#6366f1;word-break:break-all">${inviteUrl}</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#334155">
            This invitation was sent by an LMS administrator. If you weren't expecting this, you can ignore this email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
