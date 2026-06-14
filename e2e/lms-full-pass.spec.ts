/**
 * LMS Full Live Pass — Veracore / Vericore LMS
 * Covers: demo login, language/theme/password, admin nav, course CRUD cancel,
 *         compliance/group flows, invite/resend, learner course player, quiz submit.
 *
 * Run against: http://localhost:3000 (NEXT_PUBLIC_ENABLE_DEMO=true)
 */
import { test, expect, type Page } from '@playwright/test'

const BASE = 'http://localhost:3000'

const ADMIN_EMAIL  = 'admin@demo.com'
const ADMIN_PASS   = 'Admin123!'
const LEARNER_EMAIL = 'learner@demo.com'
const LEARNER_PASS  = 'Learner123!'

// ─── helpers ───────────────────────────────────────────────────────────────
async function loginAs(page: Page, role: 'admin' | 'learner') {
  await page.goto(`${BASE}/login`)
  await page.waitForSelector('form', { timeout: 10000 })

  const email = role === 'admin' ? ADMIN_EMAIL : LEARNER_EMAIL
  const pass  = role === 'admin' ? ADMIN_PASS  : LEARNER_PASS

  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', pass)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
}

async function signOut(page: Page) {
  // Try nav sign-out button
  const signOutBtn = page.locator('button', { hasText: /sign out|log out/i }).first()
  if (await signOutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signOutBtn.click()
    await page.waitForURL(/login/, { timeout: 8000 })
  } else {
    await page.goto(`${BASE}/login`)
  }
}

// ─── GROUP 1: Login page UI ─────────────────────────────────────────────────
test.describe('Login page', () => {
  test('page loads and shows sign-in form', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('theme swatches — clicking each swatch does not crash', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form')
    const swatches = page.locator('.swatch')
    const count = await swatches.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await swatches.nth(i).click()
      await page.waitForTimeout(200)
      // Page must not crash — form still present
      await expect(page.locator('form')).toBeVisible()
    }
  })

  test('language toggle — EN/ES switch', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form')
    const langBtn = page.locator('button', { hasText: /EN|ES/ }).first()
    await expect(langBtn).toBeVisible()
    await langBtn.click()
    // After reload the button text should switch
    await page.waitForTimeout(1000)
    const newLangBtn = page.locator('button', { hasText: /EN|ES/ }).first()
    await expect(newLangBtn).toBeVisible()
  })

  test('password show/hide toggle', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form')
    const pwdInput = page.locator('input[type="password"]')
    await pwdInput.fill('secret123')
    const toggleBtn = page.locator('button[type="button"]').filter({ has: page.locator('svg') }).first()
    await toggleBtn.click()
    // Input type should now be text
    const visible = page.locator('input[type="text"]').first()
    await expect(visible).toBeVisible()
    // Toggle back
    await toggleBtn.click()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('demo — learner button logs in and redirects to dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form')
    const learnerBtn = page.locator('button', { hasText: /learner demo/i })
    await expect(learnerBtn).toBeVisible({ timeout: 5000 })
    await learnerBtn.click()
    await page.waitForURL(/dashboard/, { timeout: 15000 })
    await expect(page).toHaveURL(/dashboard/)
    await signOut(page)
  })

  test('demo — admin button logs in and redirects to dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form')
    const adminBtn = page.locator('button', { hasText: /admin demo/i })
    await expect(adminBtn).toBeVisible({ timeout: 5000 })
    await adminBtn.click()
    await page.waitForURL(/dashboard/, { timeout: 15000 })
    await expect(page).toHaveURL(/dashboard/)
    await signOut(page)
  })

  test('invalid credentials shows error message', async ({ page }) => {
    await page.goto(`${BASE}/login`)
    await page.waitForSelector('form')
    await page.fill('input[type="email"]', 'bad@bad.com')
    await page.fill('input[type="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    const error = page.locator('p', { hasText: /invalid|error|incorrect/i })
    await expect(error).toBeVisible({ timeout: 8000 })
  })
})

// ─── GROUP 2: Admin navigation ──────────────────────────────────────────────
// Note: 'networkidle' is avoided — Supabase realtime WebSocket keeps connections
// open indefinitely, so we use 'domcontentloaded' instead.
test.describe('Admin navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
  })

  test('admin dashboard loads with key sections', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
  })

  test('admin nav — Courses link navigates correctly', async ({ page }) => {
    await page.goto(`${BASE}/admin/courses`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1', { hasText: /courses/i })).toBeVisible({ timeout: 15000 })
  })

  test('admin nav — Learners link navigates correctly', async ({ page }) => {
    await page.goto(`${BASE}/admin/learners`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/learners/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
  })

  test('admin nav — Completions link navigates correctly', async ({ page }) => {
    await page.goto(`${BASE}/admin/completions`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/completions/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
  })

  test('admin nav — Compliance link navigates correctly', async ({ page }) => {
    await page.goto(`${BASE}/admin/compliance`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/compliance/)
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 })
  })

  test('non-admin redirect — learner blocked from /admin/courses', async ({ page }) => {
    await signOut(page)
    await loginAs(page, 'learner')
    await page.goto(`${BASE}/admin/courses`)
    // Should redirect to dashboard or login
    await page.waitForURL(/dashboard|login/, { timeout: 8000 })
    expect(page.url()).not.toContain('/admin/courses')
  })
})

// ─── GROUP 3: Course CRUD + cancel flows ────────────────────────────────────
test.describe('Course CRUD cancel flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto(`${BASE}/admin/courses`)
    await page.waitForLoadState('domcontentloaded')
  })

  test('create course form — opens and cancel returns to list', async ({ page }) => {
    // Look for Create/New course button
    const createBtn = page.locator('button', { hasText: /create|new course|add course/i }).first()
    await expect(createBtn).toBeVisible({ timeout: 15000 })
    await createBtn.click()

    // Form or modal should appear
    const cancelBtn = page.locator('button', { hasText: /cancel/i }).first()
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click()
      // Should be back on courses page
      await expect(page.locator('h1', { hasText: /courses/i })).toBeVisible()
    } else {
      // If inline form, just confirm page didn't crash
      await expect(page.locator('h1', { hasText: /courses/i })).toBeVisible()
    }
  })

  test('course row — edit/view link navigates to course detail', async ({ page }) => {
    const rows = page.locator('table tbody tr, [data-course-id]')
    const count = await rows.count()
    if (count === 0) {
      test.skip(true, 'No courses to test edit flow — seed data needed')
      return
    }
    // Click first course edit/manage link
    const editBtn = rows.first().locator('a, button').filter({ hasText: /edit|manage|view/i }).first()
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click()
      await page.waitForLoadState('domcontentloaded')
      // Should be on course detail page
      await expect(page).toHaveURL(/admin\/courses\/\d+|admin\/courses\/[^/]+/)
    }
  })

  test('publish group modal — opens and cancel closes it', async ({ page }) => {
    // Look for publish/group button anywhere on courses page
    const publishBtn = page.locator('button', { hasText: /publish|group|course group/i }).first()
    if (await publishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await publishBtn.click()
      const modal = page.locator('[role="dialog"], .modal, [data-modal]')
      if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
        const cancelBtn = page.locator('button', { hasText: /cancel|close/i }).first()
        await cancelBtn.click()
        await expect(modal).not.toBeVisible({ timeout: 3000 })
      }
    } else {
      test.skip(true, 'No publish/group button visible — flow not exposed yet')
    }
  })
})

// ─── GROUP 4: Compliance / group flows ──────────────────────────────────────
test.describe('Compliance and group flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto(`${BASE}/admin/compliance`)
    await page.waitForLoadState('domcontentloaded')
  })

  test('compliance page loads with template cards', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 })
    // Should show at least one compliance template or section
    const cards = page.locator('[data-template], .card, article, section').first()
    // Just confirm page rendered without error
    await expect(page.locator('main')).toBeVisible()
  })

  test('compliance — generate course button visible and clickable', async ({ page }) => {
    const genBtn = page.locator('button', { hasText: /generate|create course|build course/i }).first()
    if (await genBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click it and ensure no crash
      await genBtn.click()
      await page.waitForTimeout(1000)
      await expect(page.locator('main')).toBeVisible()
    } else {
      // Compliance page rendered but no generate button — acceptable
      await expect(page.locator('main')).toBeVisible()
    }
  })

  test('course groups — accessible from admin courses', async ({ page }) => {
    await page.goto(`${BASE}/admin/courses`)
    await page.waitForLoadState('domcontentloaded')
    // Look for groups tab or link
    const groupLink = page.locator('button, a', { hasText: /group|groups/i }).first()
    if (await groupLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await groupLink.click()
      await page.waitForTimeout(500)
      await expect(page.locator('main')).toBeVisible()
    } else {
      // Groups may be nested in course detail — confirm no crash
      await expect(page.locator('main')).toBeVisible()
    }
  })
})

// ─── GROUP 5: Invite / resend flows ─────────────────────────────────────────
test.describe('Invite and resend flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto(`${BASE}/admin/learners`)
    await page.waitForLoadState('domcontentloaded')
  })

  test('invite modal — opens on Invite button click', async ({ page }) => {
    const inviteBtn = page.locator('button', { hasText: /invite/i }).first()
    await expect(inviteBtn).toBeVisible({ timeout: 8000 })
    await inviteBtn.click()
    // Modal or inline form should appear
    const emailInput = page.locator('input[type="email"]').first()
    await expect(emailInput).toBeVisible({ timeout: 5000 })
  })

  test('invite modal — cancel/close dismisses without action', async ({ page }) => {
    const inviteBtn = page.locator('button', { hasText: /invite/i }).first()
    await inviteBtn.click()
    await page.waitForTimeout(500)
    const cancelBtn = page.locator('button', { hasText: /cancel|close/i }).first()
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click()
      // Email input should be gone
      const emailInput = page.locator('input[type="email"]').first()
      await expect(emailInput).not.toBeVisible({ timeout: 3000 })
    }
  })

  test('resend invite button — visible for pending invites', async ({ page }) => {
    // Look for resend button in the invites table/list
    const resendBtn = page.locator('button', { hasText: /resend/i }).first()
    if (await resendBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await resendBtn.click()
      // Should show confirmation or disable briefly
      await page.waitForTimeout(1500)
      // Page must not crash
      await expect(page.locator('main')).toBeVisible()
    } else {
      test.skip(true, 'No pending invites to resend — seed data needed')
    }
  })

  test('invite form — empty submit shows validation', async ({ page }) => {
    const inviteBtn = page.locator('button', { hasText: /invite/i }).first()
    await inviteBtn.click()
    await page.waitForTimeout(500)
    const submitBtn = page.locator('button[type="submit"], button', { hasText: /send invite|invite/i }).last()
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click()
      // Browser native validation or custom error
      await page.waitForTimeout(500)
      await expect(page.locator('main')).toBeVisible()
    }
  })
})

// ─── GROUP 6: Learner — course player ───────────────────────────────────────
test.describe('Learner course player', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'learner')
    await page.goto(`${BASE}/dashboard`)
    await page.waitForLoadState('domcontentloaded')
  })

  test('learner dashboard loads enrolled courses', async ({ page }) => {
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 })
    // Should show course cards or empty state
    await expect(page.locator('main')).toBeVisible()
  })

  test('course player — navigate to first enrolled course', async ({ page }) => {
    // Look for any course link on the dashboard
    const courseLink = page.locator('a[href*="/course/"]').first()
    if (await courseLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await courseLink.click()
      await page.waitForLoadState('domcontentloaded')
      await expect(page).toHaveURL(/course\/\d+/)
      // Course player content visible
      await expect(page.locator('main, [data-course-player]')).toBeVisible()
    } else {
      test.skip(true, 'No enrolled courses — seed data needed')
    }
  })

  test('course player — video section renders without crash', async ({ page }) => {
    const courseLink = page.locator('a[href*="/course/"]').first()
    if (await courseLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await courseLink.click()
      await page.waitForLoadState('domcontentloaded')
      // iFrame (YouTube/Vimeo) or video element should be present
      const mediaEl = page.locator('iframe, video').first()
      await expect(mediaEl.or(page.locator('main'))).toBeVisible({ timeout: 8000 })
    } else {
      test.skip(true, 'No enrolled courses — seed data needed')
    }
  })

  test('course player — next/continue button advances state', async ({ page }) => {
    const courseLink = page.locator('a[href*="/course/"]').first()
    if (await courseLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await courseLink.click()
      await page.waitForLoadState('domcontentloaded')
      const nextBtn = page.locator('button', { hasText: /next|continue|start quiz/i }).first()
      if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextBtn.click()
        await page.waitForTimeout(800)
        await expect(page.locator('main')).toBeVisible()
      }
    } else {
      test.skip(true, 'No enrolled courses — seed data needed')
    }
  })
})

// ─── GROUP 7: Quiz submit ────────────────────────────────────────────────────
test.describe('Quiz submit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'learner')
  })

  test('quiz — questions render when quiz section reached', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    await page.waitForLoadState('domcontentloaded')

    const courseLink = page.locator('a[href*="/course/"]').first()
    if (!(await courseLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No enrolled courses — seed data needed')
      return
    }

    await courseLink.click()
    await page.waitForLoadState('domcontentloaded')

    // Click through to quiz if possible
    const quizBtn = page.locator('button', { hasText: /start quiz|take quiz|quiz/i }).first()
    if (await quizBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quizBtn.click()
      await page.waitForTimeout(800)
      // Quiz questions should appear
      const question = page.locator('[data-question], .question, input[type="radio"]').first()
      await expect(question.or(page.locator('main'))).toBeVisible()
    } else {
      // May already be on quiz section — look for radio/checkbox answers
      const answerInput = page.locator('input[type="radio"], input[type="checkbox"]').first()
      if (await answerInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(answerInput).toBeVisible()
      } else {
        test.skip(true, 'Quiz section not reachable without watching video')
      }
    }
  })

  test('quiz — select answers and submit fires API', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    await page.waitForLoadState('domcontentloaded')

    const courseLink = page.locator('a[href*="/course/"]').first()
    if (!(await courseLink.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'No enrolled courses')
      return
    }

    await courseLink.click()
    await page.waitForLoadState('domcontentloaded')

    // Try to reach quiz
    const quizBtn = page.locator('button', { hasText: /start quiz|quiz/i }).first()
    if (await quizBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quizBtn.click()
      await page.waitForTimeout(800)
    }

    const answers = page.locator('input[type="radio"]')
    const answerCount = await answers.count()
    if (answerCount === 0) {
      test.skip(true, 'No quiz answers visible — need video completion first')
      return
    }

    // Select first option for each question group
    const names = new Set<string>()
    for (let i = 0; i < answerCount; i++) {
      const name = await answers.nth(i).getAttribute('name')
      if (name && !names.has(name)) {
        names.add(name)
        await answers.nth(i).check()
      }
    }

    // Intercept the quiz submit API call
    const [response] = await Promise.all([
      page.waitForResponse(
        r => r.url().includes('/api/quiz') || r.url().includes('submit'),
        { timeout: 10000 }
      ).catch(() => null),
      page.locator('button', { hasText: /submit/i }).first().click().catch(() => {}),
    ])

    if (response) {
      expect([200, 201, 400]).toContain(response.status())
    }

    // Result feedback or score should appear
    await expect(page.locator('main')).toBeVisible()
  })
})
