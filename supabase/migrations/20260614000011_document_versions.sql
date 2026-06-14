-- Add version tracking to documents
alter table public.documents
  add column if not exists version int not null default 1,
  add column if not exists content_hash text;

-- Version history table
create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version int not null,
  file_path text not null,
  file_name text not null,
  file_size bigint,
  content_hash text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz default now(),
  notes text,
  unique(document_id, version)
);

alter table public.document_versions enable row level security;

drop policy if exists "doc_versions_admin" on public.document_versions;
drop policy if exists "doc_versions_learner" on public.document_versions;

create policy "doc_versions_admin" on public.document_versions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

create policy "doc_versions_learner" on public.document_versions for select using (
  exists (select 1 from public.profiles where id = auth.uid())
);

-- Pin acknowledgments to the version that existed when they were made
alter table public.document_acks
  add column if not exists document_version int,
  add column if not exists content_hash text;
