-- ── Work Plans: time-phased course curricula ────────────────────────────────

create table if not exists work_plans (
  id          serial primary key,
  name        text not null,
  description text,
  created_at  timestamptz default now()
);

-- A phase/block within a plan
create table if not exists work_plan_blocks (
  id          serial primary key,
  plan_id     int  not null references work_plans(id) on delete cascade,
  name        text not null,
  delay_days  int  not null default 0,   -- days after assignment start_date
  sort_order  int  not null default 0,
  created_at  timestamptz default now()
);

-- Courses inside a block
create table if not exists work_plan_block_courses (
  id         serial primary key,
  block_id   int not null references work_plan_blocks(id) on delete cascade,
  course_id  int not null references courses(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique(block_id, course_id)
);

-- Plan assigned to a team or an individual user
-- start_date is when the clock starts ticking for delay_days
create table if not exists work_plan_assignments (
  id          serial primary key,
  plan_id     int  not null references work_plans(id) on delete cascade,
  team_id     int  references teams(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  start_date  date not null default current_date,
  created_at  timestamptz default now(),
  constraint assignment_target check (team_id is not null or user_id is not null)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table work_plans              enable row level security;
alter table work_plan_blocks        enable row level security;
alter table work_plan_block_courses enable row level security;
alter table work_plan_assignments   enable row level security;

create policy "admins_work_plans"              on work_plans              for all using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "admins_work_plan_blocks"        on work_plan_blocks        for all using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "admins_work_plan_block_courses" on work_plan_block_courses for all using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "admins_work_plan_assignments"   on work_plan_assignments   for all using (exists (select 1 from profiles where id = auth.uid() and is_admin));
