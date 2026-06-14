import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Dev-only seed endpoint — returns 404 in production unless SEED_SECRET is set
export async function GET(request: Request) {
  const isDev = process.env.NODE_ENV === 'development'
  const SEED_SECRET = process.env.SEED_SECRET
  const providedSecret = new URL(request.url).searchParams.get('secret')

  // Fail-closed: reject if not dev AND (no secret configured OR wrong secret)
  if (!isDev) {
    if (!SEED_SECRET || providedSecret !== SEED_SECRET) {
      return new Response('Not found', { status: 404 })
    }
  }

  const log: string[] = []

  try {
    // Demo admin
    let adminId: string
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAdmin = existingUsers.users.find(u => u.email === 'admin@demo.com')

    if (existingAdmin) {
      adminId = existingAdmin.id
      log.push('Admin user already exists.')
    } else {
      const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
        email: 'admin@demo.com',
        password: 'Admin123!',
        email_confirm: true,
        user_metadata: { first_name: 'Admin', last_name: 'Demo' },
      })
      if (adminError) throw new Error(`Admin creation: ${adminError.message}`)
      adminId = adminData.user.id
      log.push('Created admin user.')
    }

    // Set is_admin
    await supabaseAdmin.from('profiles').upsert({ id: adminId, first_name: 'Admin', last_name: 'Demo', is_admin: true })
    log.push('Set is_admin=true on admin profile.')

    // Demo learner
    let learnerId: string
    const existingLearner = existingUsers.users.find(u => u.email === 'learner@demo.com')

    if (existingLearner) {
      learnerId = existingLearner.id
      log.push('Learner user already exists.')
    } else {
      const { data: learnerData, error: learnerError } = await supabaseAdmin.auth.admin.createUser({
        email: 'learner@demo.com',
        password: 'Learner123!',
        email_confirm: true,
        user_metadata: { first_name: 'Alex', last_name: 'Demo' },
      })
      if (learnerError) throw new Error(`Learner creation: ${learnerError.message}`)
      learnerId = learnerData.user.id
      log.push('Created learner user.')
    }
    await supabaseAdmin.from('profiles').upsert({ id: learnerId, first_name: 'Alex', last_name: 'Demo' })
    log.push('Upserted learner profile name.')

    // Check existing courses
    const { data: existingCourses } = await supabaseAdmin.from('courses').select('id, title')
    if (existingCourses && existingCourses.length > 0) {
      log.push(`Courses already seeded (${existingCourses.length} found). Skipping.`)
    } else {
      const courses = [
        {
          title: 'Professional Development Fundamentals',
          description: 'Build the leadership mindset and intrinsic motivation skills that drive high-performing teams.',
          videos: [
            { title: 'Simon Sinek: How Great Leaders Inspire Action', url: 'https://www.youtube.com/watch?v=qp0HIF3SfI4', duration_seconds: 1088, sort_order: 1 },
            { title: 'Angela Duckworth: The Power of Passion and Perseverance', url: 'https://www.youtube.com/watch?v=H14bBuluwB8', duration_seconds: 366, sort_order: 2 },
            { title: 'Carol Dweck: The Power of Believing That You Can Improve', url: 'https://www.youtube.com/watch?v=_X0mgOOSpLU', duration_seconds: 618, sort_order: 3 },
          ],
          questions: [
            { text: "According to Simon Sinek, what is the 'Golden Circle' concept?", option_a: 'A framework starting with Why, then How, then What', option_b: 'A sales technique for closing deals', option_c: 'A time management tool for executives', option_d: 'A method for hiring top performers', correct_answer: 'A' },
            { text: "What does Angela Duckworth define as 'grit'?", option_a: 'Passion and perseverance for long-term goals', option_b: 'Natural talent and intelligence', option_c: 'Ability to recover from failure quickly', option_d: 'Social connections and networking skills', correct_answer: 'A' },
            { text: "Carol Dweck's research shows that a growth mindset leads to:", option_a: 'Greater achievement and resilience', option_b: 'Faster completion of tasks', option_c: 'Reduced need for feedback', option_d: 'Preference for easy challenges', correct_answer: 'A' },
          ],
        },
        {
          title: 'Workplace Communication Excellence',
          description: 'Master the science of effective verbal and non-verbal communication.',
          videos: [
            { title: 'Julian Treasure: How to Speak So That People Want to Listen', url: 'https://www.youtube.com/watch?v=eIho2S0ZahI', duration_seconds: 599, sort_order: 1 },
            { title: 'Celeste Headlee: 10 Ways to Have a Better Conversation', url: 'https://www.youtube.com/watch?v=R1vskiVDwl4', duration_seconds: 688, sort_order: 2 },
            { title: 'Amy Cuddy: Your Body Language May Shape Who You Are', url: 'https://www.youtube.com/watch?v=Ks-_Mh1QhMc', duration_seconds: 1262, sort_order: 3 },
          ],
          questions: [
            { text: 'Julian Treasure identifies which habit as most damaging to communication?', option_a: 'Gossip, judging, and negativity', option_b: 'Speaking too quickly', option_c: 'Avoiding eye contact', option_d: 'Using complex vocabulary', correct_answer: 'A' },
            { text: "Celeste Headlee's most important rule for better conversations is:", option_a: 'Listen more than you talk, with full presence', option_b: 'Prepare your response before the other person finishes', option_c: 'Keep conversations under 5 minutes', option_d: 'Always have an agenda before speaking', correct_answer: 'A' },
            { text: "Amy Cuddy's research suggests that power poses before a stressful event:", option_a: 'Can increase confidence and change hormone levels', option_b: 'Have no measurable effect on performance', option_c: 'Only work for naturally confident people', option_d: 'Are effective only in private settings', correct_answer: 'A' },
          ],
        },
      ]

      for (const course of courses) {
        const { data: newCourse, error: courseErr } = await supabaseAdmin
          .from('courses').insert({ title: course.title, description: course.description }).select().single()
        if (courseErr) throw new Error(`Course: ${courseErr.message}`)

        await supabaseAdmin.from('videos').insert(course.videos.map(v => ({ ...v, course_id: newCourse.id })))
        await supabaseAdmin.from('questions').insert(course.questions.map(q => ({ ...q, course_id: newCourse.id })))

        // Enroll learner
        await supabaseAdmin.from('enrollments').upsert({ user_id: learnerId, course_id: newCourse.id, status: 'in_progress' })
        log.push(`Created course: "${course.title}"`)
      }
    }

    return NextResponse.json({ ok: true, message: 'Seed completed.', log })
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: String(err), log }, { status: 500 })
  }
}
