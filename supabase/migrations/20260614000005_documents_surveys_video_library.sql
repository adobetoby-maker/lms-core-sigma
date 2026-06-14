-- Documents library (PDFs uploaded by admin, downloadable by staff)
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  category     text not null default 'General',
  file_path    text not null,
  file_name    text not null,
  file_size    bigint,
  requires_ack boolean not null default false,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Staff acknowledgments for required documents
create table if not exists public.document_acks (
  document_id  uuid not null references public.documents(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  acked_at     timestamptz not null default now(),
  primary key (document_id, user_id)
);

-- Surveys created by admin
create table if not exists public.surveys (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  department   text,
  is_active    boolean not null default true,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Questions within a survey
create table if not exists public.survey_questions (
  id           uuid primary key default gen_random_uuid(),
  survey_id    uuid not null references public.surveys(id) on delete cascade,
  question     text not null,
  type         text not null default 'text',  -- text | rating | yes_no | multiple_choice
  options      jsonb,                          -- array of strings for multiple_choice
  required     boolean not null default true,
  sort_order   int not null default 0
);

-- User responses to surveys (one row per user per survey — upserted on resubmit)
create table if not exists public.survey_responses (
  survey_id    uuid not null references public.surveys(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  answers      jsonb not null default '{}',   -- { questionId: answer }
  submitted_at timestamptz not null default now(),
  primary key (survey_id, user_id)
);

-- Curated compliance video library (seeded by admin; never deleted by users)
create table if not exists public.video_library (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  youtube_id   text not null unique,
  channel      text not null,
  description  text,
  thumbnail    text,
  topics       text[] not null default '{}',
  industries   text[] not null default '{}',
  duration_s   int,
  added_at     timestamptz not null default now()
);

-- RLS: documents — all authenticated users can read; only admins write
alter table public.documents enable row level security;
create policy "docs_read"   on public.documents for select using (auth.uid() is not null);
create policy "docs_admin"  on public.documents for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- RLS: document_acks — users manage their own acks; admins read all
alter table public.document_acks enable row level security;
create policy "acks_own"    on public.document_acks for all using (user_id = auth.uid());
create policy "acks_admin"  on public.document_acks for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- RLS: surveys — active surveys readable by all; all surveys by admins; responses own
alter table public.surveys enable row level security;
create policy "surveys_active" on public.surveys for select using (
  is_active = true or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);
create policy "surveys_admin"  on public.surveys for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

alter table public.survey_questions enable row level security;
create policy "sq_read"    on public.survey_questions for select using (auth.uid() is not null);
create policy "sq_admin"   on public.survey_questions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

alter table public.survey_responses enable row level security;
create policy "sr_own"     on public.survey_responses for all using (user_id = auth.uid());
create policy "sr_admin"   on public.survey_responses for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- RLS: video_library — all authenticated users can read; only admins write
alter table public.video_library enable row level security;
create policy "vl_read"    on public.video_library for select using (auth.uid() is not null);
create policy "vl_admin"   on public.video_library for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Storage bucket for document PDFs (must be created in Supabase dashboard or via API)
-- bucket name: documents
-- public: false (signed URLs required for download)
