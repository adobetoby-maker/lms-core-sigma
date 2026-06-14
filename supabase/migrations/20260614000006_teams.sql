-- ── Teams: learner grouping + auto-enrollment ──────────────────────────────

create table if not exists teams (
  id          serial primary key,
  name        text not null,
  description text,
  created_at  timestamptz default now()
);

create table if not exists team_members (
  id         serial primary key,
  team_id    int  not null references teams(id)      on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(team_id, user_id)
);

create table if not exists team_courses (
  id         serial primary key,
  team_id    int not null references teams(id)   on delete cascade,
  course_id  int not null references courses(id) on delete cascade,
  created_at timestamptz default now(),
  unique(team_id, course_id)
);

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table teams        enable row level security;
alter table team_members enable row level security;
alter table team_courses enable row level security;

-- admins: full access
drop policy if exists "admins_teams_all"        on teams;
drop policy if exists "admins_team_members_all" on team_members;
drop policy if exists "admins_team_courses_all" on team_courses;
create policy "admins_teams_all"        on teams        for all using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "admins_team_members_all" on team_members for all using (exists (select 1 from profiles where id = auth.uid() and is_admin));
create policy "admins_team_courses_all" on team_courses for all using (exists (select 1 from profiles where id = auth.uid() and is_admin));

-- learners: read their own memberships only
drop policy if exists "learners_own_team_members" on team_members;
drop policy if exists "learners_own_team_courses" on team_courses;
create policy "learners_own_team_members" on team_members for select using (user_id = auth.uid());
create policy "learners_own_team_courses" on team_courses for select using (
  exists (select 1 from team_members tm where tm.team_id = team_courses.team_id and tm.user_id = auth.uid())
);
