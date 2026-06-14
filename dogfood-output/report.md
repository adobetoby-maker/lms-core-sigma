# Vericore LMS Deployment Readiness QA Report

Date: 2026-06-14
Project: /Users/drive/lms-vericore
Local test URL: http://localhost:3000
Test mode: production build via `npm run build` + `npm run start -- -H 0.0.0.0`

## Executive summary

Recommendation: NOT READY for production deployment until the P0/P1 items below are fixed.

The core LMS is close: production build passes, auth works for admin and learner roles, primary admin navigation works, course tables/detail pages render cleanly, learner dashboard/course access works, theme/language/password toggles work, and API routes mostly reject unauthenticated calls correctly.

However, I found two deployment blockers:

1. Cron endpoints can be authorized with `Authorization: Bearer undefined` when `CRON_SECRET` is missing. In this local production-like environment, both cron endpoints returned 200 with that header. This must fail closed before deployment because those endpoints can send reminder/escalation emails.
2. Public URLs are inconsistent/stale across metadata, sitemap, robots, and invite email fallbacks. Some code points to `lms-platform-one-blond.vercel.app`, some to `lms-platform-7tqm6ioj7-adobetoby-5572s-projects.vercel.app`, and invite emails fall back to `lms-v2-green.vercel.app` unless `NEXT_PUBLIC_SITE_URL` is set. This can send learners to the wrong app after deployment.

## What I tested

Build/deployment checks:
- `npm run build` completed successfully.
- Started the optimized production server locally.
- Checked security headers on /login.
- Checked unauthenticated access to protected app routes.
- Checked unauthenticated access to key API routes.

Browser/functionality checks with Playwright:
- Login page visual render on desktop and mobile.
- Theme swatches.
- EN/ES language toggle and persistence.
- Password visibility toggle.
- Invalid login error handling.
- Admin login with seeded admin account.
- Learner login with seeded learner account.
- Admin dashboard.
- Admin nav: Admin, Courses, Completions, Learners, Compliance.
- Courses table and row actions.
- Create course form open/cancel/native required validation.
- Course selection toolbar.
- Publish-as-group modal open/cancel.
- Delete confirmation appears and is cancellable; I did not confirm destructive deletes.
- Course edit page sections: Course Details, Videos, Quiz Questions, Learners.
- Video manager: Add Video form, YouTube/Vimeo/Upload tabs, validation, cancel, delete confirmation cancel.
- Question manager: Add Question form, correct-answer button toggles, validation, cancel.
- Learner invite form empty submit validation; I did not send real invites.
- Compliance page template list and preview controls.
- Sign out returns to login.
- Learner dashboard and first course page access.

Screenshots/evidence saved under:
/Users/drive/lms-vericore/dogfood-output/screenshots

Raw automation logs:
/Users/drive/lms-vericore/dogfood-output/raw-results.json
/Users/drive/lms-vericore/dogfood-output/deep-results.json

## Issues found

### P0 — Cron endpoints fail open if CRON_SECRET is missing

Observed:
- `.env.local` does not define `CRON_SECRET`.
- No-auth request correctly returned 401.
- But request with `Authorization: Bearer undefined` returned 200 for both cron endpoints:
  - /api/cron/compliance-reminder
  - /api/cron/compliance-overdue

Repro commands:
`curl -s -H 'authorization: Bearer undefined' http://localhost:3000/api/cron/compliance-reminder`
`curl -s -H 'authorization: Bearer undefined' http://localhost:3000/api/cron/compliance-overdue`

Actual:
- 200 `{"ok":true,"sent":0}` locally.

Expected:
- 401 unless a real configured secret exists and the header exactly matches it.

Why it matters:
- These endpoints can send weekly compliance reminder and overdue alert emails. If production forgets `CRON_SECRET`, anyone who guesses/sends `Bearer undefined` can invoke them.

Suggested fix:
- Fail closed when `process.env.CRON_SECRET` is absent.
- Example logic:
  - `const secret = process.env.CRON_SECRET`
  - `if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return 401`
- Add `CRON_SECRET` to production env vars before deploying.

### P1 — Deployment URLs are inconsistent/stale

Observed hardcoded URLs:
- app/layout.tsx: `https://lms-platform-one-blond.vercel.app`
- app/login/page.tsx: `https://lms-platform-7tqm6ioj7-adobetoby-5572s-projects.vercel.app`
- public/robots.txt sitemap points to `lms-platform-7tqm6ioj7-adobetoby-5572s-projects.vercel.app`
- public/sitemap.xml points to `lms-platform-7tqm6ioj7-adobetoby-5572s-projects.vercel.app`
- app/api/invite/route.ts fallback: `https://lms-v2-green.vercel.app`
- app/api/resend-invite/route.ts fallback: `https://lms-v2-green.vercel.app`
- `.env.local` does not contain `NEXT_PUBLIC_SITE_URL`.

Expected:
- One canonical production LMS URL everywhere.
- Invite and retry emails should never fall back to an old Vercel URL.

Why it matters:
- Learners can receive invite links to the wrong environment.
- OG/canonical metadata can point to the wrong deployment.
- Robots/sitemap will advertise stale URLs.

Suggested fix:
- Replace hardcoded constants with `process.env.NEXT_PUBLIC_SITE_URL` and fail loudly if missing in production.
- Regenerate sitemap/robots for the final production domain.
- Set `NEXT_PUBLIC_SITE_URL` in Vercel before launch.

### P1 — Build succeeds but Next.js reports ambiguous workspace root

Observed during `npm run build`:
- Next.js inferred workspace root as `/Users/drive` because it detected multiple lockfiles.
- It also detected `/Users/drive/lms-vericore/package-lock.json`.

Expected:
- Next should use `/Users/drive/lms-vericore` as the app root without warnings.

Why it matters:
- Can cause inconsistent build cache/root behavior between local and deployment.

Suggested fix:
- Set `turbopack.root` in `next.config.ts` to the project directory, or remove the parent `/Users/drive/package-lock.json` if not needed.

### P2 — Demo credentials still exist in production data

Observed:
- Auth users include `admin@demo.com` and `learner@demo.com`.
- Login page hides demo buttons because `NEXT_PUBLIC_ENABLE_DEMO` is disabled, but the seeded accounts still authenticate.

Expected:
- Client production should not have known demo credentials unless this is intentionally a private staging/demo environment.

Why it matters:
- Known credentials are risky if this Supabase project is used for a client deployment.

Suggested fix:
- Before production handoff, remove/rotate demo users or set strong client-specific admin credentials.

### P2 — README is still the generic create-next-app README

Observed:
- README still describes a stock Next.js app.

Expected:
- Deployment docs for env vars, Supabase schema, required Vercel settings, cron setup, and admin bootstrap.

Suggested fix:
- Add a production runbook before client deployment.

### P3 — Visual/UX polish observations

Observed:
- Desktop UI is cohesive and professional overall.
- Mobile login is clean and readable.
- Some UI still uses emoji-like flag icons for language and clipboard icon in CSV upload; if strict “no emoji as icons” applies, swap to SVG/icon components.
- Course list includes old/test content: `test`, `test 2`, duplicate AML courses, and generated compliance courses with no videos. This may be fine for staging but not production client handoff.

Suggested fix:
- Clean demo/test data before deployment or use a fresh production Supabase database.
- Replace emoji glyphs with SVG icons where desired.

## What works well

- Production build passes cleanly aside from the workspace-root warning.
- Auth redirect behavior works: unauthenticated users go to /login.
- Admin and learner role redirects work.
- Admin navigation is straightforward and all main pages load.
- Courses table is functional and dense without feeling cluttered.
- Course edit page is strong: details, videos, quiz, learners, and summaries are all in one place.
- Native form validation prevents empty course/invite submissions.
- Delete actions have confirmation dialogs.
- Most API routes correctly reject unauthenticated access with 401.
- Security headers are present: CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy.
- Theme switching and bilingual EN/ES login work.
- Mobile login layout looks production-quality.
- Learner flow reaches dashboard and course page.

## Deployment readiness checklist

Before deployment:
- Fix CRON_SECRET fail-open bug.
- Set `CRON_SECRET` in production.
- Set `NEXT_PUBLIC_SITE_URL` in production.
- Replace all hardcoded stale Vercel URLs.
- Update robots.txt and sitemap.xml.
- Decide whether to remove demo accounts/data.
- Resolve Next.js workspace-root warning.
- Add production README/runbook.

Recommended after fixes:
- Re-run `npm run build`.
- Re-run the Playwright dogfood suite.
- Test one real invite email on a disposable address after `NEXT_PUBLIC_SITE_URL` is set.
- Test Vercel cron with the real authorization header.
- Run a fresh Supabase production database or sanitize current demo rows.

## Final verdict

Not deploy-ready today because of the cron authorization bug and stale URL/invite-link configuration.

Once those are fixed, I would consider it ready for a staging/client-review deployment. For a true production handoff, I would also clean demo users/data and add a deployment runbook.
