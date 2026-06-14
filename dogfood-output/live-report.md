# lms-vericore Live Deployment QA Report

Target: https://lms-vericore.vercel.app
Date: 2026-06-14
Scope: Live deployment readiness smoke/audit: public routing, auth health, Supabase connectivity, protected API behavior, static assets, metadata/SEO, and live-vs-local blocker verification.

## Verdict

NOT READY for production launch.

The live deployment is serving and the core backend/auth stack is reachable, but the same critical cron authorization bug found locally is present on production. The deployment also still publishes stale Vercel URLs in canonical metadata, OpenGraph tags, robots.txt, and sitemap.xml.

## Executive Summary

Test results:
- Live site responds: PASS
- Root redirects unauthenticated users to /login: PASS
- Protected pages redirect unauthenticated users to /login: PASS
- Static Next.js assets load: PASS
- Admin demo Supabase sign-in: PASS
- Learner demo Supabase sign-in: PASS
- Wrong password rejection: PASS
- Supabase live data reachability: PASS
- Unauthenticated API protection: PASS
- Cron fail-closed behavior: FAIL
- Canonical deployment URL consistency: FAIL
- Browser click-through on live deployment: LIMITED — the browser automation tool timed out on navigation, so I verified live behavior by HTTP/API/Supabase probes instead of full UI clicking.

Issue count:
- Critical: 1
- High: 1
- Medium: 1
- Low: 2

## Findings

### P0 / Critical — Cron endpoints authorize `Bearer undefined` on live production

Affected URLs:
- https://lms-vericore.vercel.app/api/cron/compliance-reminder
- https://lms-vericore.vercel.app/api/cron/compliance-overdue

Observed live behavior:
- No Authorization header: 401 Unauthorized
- `Authorization: Bearer undefined`: 200 OK
- `Authorization: Bearer null`: 401 Unauthorized
- Wrong bearer token: 401 Unauthorized

Evidence:
- `/api/cron/compliance-reminder` with `Bearer undefined` returned `200 {"ok":true,"sent":0}`
- `/api/cron/compliance-overdue` with `Bearer undefined` returned `200 {"ok":true,"sent":0}`

Why this matters:
These routes trigger compliance reminder/overdue workflows. A cron route must fail closed if `CRON_SECRET` is missing or invalid. Production currently behaves as if the secret is missing and string-comparison is accepting `undefined`.

Recommended fix:
- Require `process.env.CRON_SECRET` to exist before comparing tokens.
- Return 500 or 401 if the env var is absent.
- Use a timing-safe comparison for non-empty values.
- Add tests for no auth, wrong auth, `Bearer undefined`, `Bearer null`, and valid auth.

Suggested guard shape:

```ts
const cronSecret = process.env.CRON_SECRET
if (!cronSecret) {
  console.error('CRON_SECRET is not configured')
  return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
}

const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### P1 / High — Live deployment publishes stale/non-production URLs

Affected live responses:
- https://lms-vericore.vercel.app/login
- https://lms-vericore.vercel.app/robots.txt
- https://lms-vericore.vercel.app/sitemap.xml

Observed:
- `/login` canonical includes `https://lms-platform-one-blond.vercel.app/login`
- `/login` also includes another canonical/OG URL: `https://lms-platform-7tqm6ioj7-adobetoby-5572s-projects.vercel.app/login`
- `/robots.txt` sitemap points to `https://lms-platform-7tqm6ioj7-adobetoby-5572s-projects.vercel.app/sitemap.xml`
- `/sitemap.xml` lists `https://lms-platform-7tqm6ioj7-adobetoby-5572s-projects.vercel.app/login`

Why this matters:
Users, invite links, SEO crawlers, OpenGraph previews, and compliance documentation can be sent to old preview deployments instead of the live `lms-vericore.vercel.app` deployment.

Recommended fix:
- Set `NEXT_PUBLIC_SITE_URL=https://lms-vericore.vercel.app` in Vercel.
- Replace all hardcoded Vercel preview URLs with one env-backed canonical site URL.
- Regenerate robots.txt and sitemap.xml from the same canonical config.
- Re-test `/login`, `/robots.txt`, `/sitemap.xml`, invite emails, and resend-invite emails after redeploy.

### P2 / Medium — Demo accounts and demo credentials are live in the production client bundle

Observed:
- Public JS chunk contains demo account labels/credentials for `admin@demo.com` and `learner@demo.com`.
- Both demo accounts successfully authenticated against live Supabase.
- Wrong password was correctly rejected.

Why this matters:
This may be intentional for an internal demo deployment, but it should not ship as a client-facing production LMS. A real customer LMS should not expose admin/learner demo entry points in the public bundle.

Recommended fix:
- Remove Quick Demo Access buttons before production/customer launch.
- Rotate or disable demo credentials on the live Supabase project.
- If demos are needed, isolate them on a separate demo deployment and database.

### P3 / Low — Browser automation click-through could not complete against live deployment

Observed:
- HTTP GETs to the live deployment are fast and successful.
- The browser automation tool timed out trying to navigate to `/login`, `/`, and even `/robots.txt`.
- Because of that, I could not honestly claim a complete live UI button-by-button click test in this run.

Why this matters:
This may be a tooling issue in the automation browser session, not necessarily an end-user issue. However, before launch, a human or working Playwright run should still click through the live UI directly.

Recommended follow-up:
- Run a fresh Playwright headed/headless pass against https://lms-vericore.vercel.app.
- Specifically click: language selector, theme/visibility toggles, Admin Demo, Learner Demo, nav links, admin tabs, course create/edit/delete cancel flows, compliance group flows, invite/resend flows, learner course player, quiz submit.

### P3 / Low — Some schema/API checks show expected app data but require UI confirmation

Observed live Supabase checks:
- Admin demo sign-in succeeded.
- Learner demo sign-in succeeded.
- Learner RLS check showed learner-visible enrollments/quiz attempts belonged only to the learner account tested.
- Courses, videos, enrollments, profiles, quiz attempts were reachable according to role/session.

Why this matters:
Backend reachability is good, but UI behavior still needs a successful live browser run after the P0/P1 fixes.

## What Works Well

- The live deployment is reachable over HTTPS.
- Root path `/` redirects unauthenticated users to `/login`.
- Unauthenticated protected routes `/admin`, `/admin/courses`, `/admin/compliance`, `/admin/groups`, and `/dashboard` redirect to `/login`.
- Static Next.js assets referenced by `/login` all returned 200.
- Security headers are present:
  - Content-Security-Policy
  - Strict-Transport-Security
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy
- Live Supabase configuration is present and usable by the client.
- Admin demo authentication works.
- Learner demo authentication works.
- Invalid password rejects correctly.
- Unauthenticated POSTs to `/api/invite` and `/api/resend-invite` return 401.
- Cron endpoints reject no auth, wrong auth, and `Bearer null`.

## What I Would Change Before Deployment

1. Fix cron auth fail-open behavior immediately.
2. Add `CRON_SECRET` in Vercel and verify `Bearer undefined` returns non-200 after redeploy.
3. Consolidate all live URLs behind `NEXT_PUBLIC_SITE_URL`.
4. Update robots.txt, sitemap.xml, canonical URLs, OpenGraph URLs, and invite/resend links to use `https://lms-vericore.vercel.app`.
5. Remove or isolate demo accounts before customer production.
6. Run one clean browser/Playwright live click-through after fixes.
7. Add a deployment smoke script that runs these checks automatically before promoting any Vercel deployment.

## Deployment Readiness Checklist

Must pass before launch:
- [ ] `Bearer undefined` returns 401 or 500 on both cron endpoints.
- [ ] `CRON_SECRET` is configured in Vercel.
- [ ] `/robots.txt` sitemap points to `https://lms-vericore.vercel.app/sitemap.xml`.
- [ ] `/sitemap.xml` URLs point to `https://lms-vericore.vercel.app`.
- [ ] `/login` canonical and OG URLs point to `https://lms-vericore.vercel.app/login` only.
- [ ] Demo quick-access buttons are removed or confirmed acceptable for demo-only launch.
- [ ] Fresh live UI click-through passes for admin and learner roles.

## Final Recommendation

Do not launch this as production yet. Fix the cron secret bug first, then fix canonical/stale URLs, then run one final live browser click-through. After those are clean, the app should be close to deployment-ready.
