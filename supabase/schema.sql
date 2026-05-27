create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  creator text not null default 'StarPower Tech',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists set_messages_updated_at on public.messages;
create trigger set_messages_updated_at
before update on public.messages
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Users can read owned or public projects" on public.projects;
create policy "Users can read owned or public projects"
on public.projects
for select
to authenticated
using (user_id = (select auth.uid()) or is_public = true);

drop policy if exists "Users can create owned projects" on public.projects;
create policy "Users can create owned projects"
on public.projects
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can update owned projects" on public.projects;
create policy "Users can update owned projects"
on public.projects
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete owned projects" on public.projects;
create policy "Users can delete owned projects"
on public.projects
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can read conversations from visible projects" on public.conversations;
create policy "Users can read conversations from visible projects"
on public.conversations
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = conversations.project_id
      and (projects.user_id = (select auth.uid()) or projects.is_public = true)
  )
);

drop policy if exists "Users can create conversations in owned projects" on public.conversations;
create policy "Users can create conversations in owned projects"
on public.conversations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = conversations.project_id
      and projects.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update conversations in owned projects" on public.conversations;
create policy "Users can update conversations in owned projects"
on public.conversations
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = conversations.project_id
      and projects.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = conversations.project_id
      and projects.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete conversations in owned projects" on public.conversations;
create policy "Users can delete conversations in owned projects"
on public.conversations
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = conversations.project_id
      and projects.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can read messages from visible projects" on public.messages;
create policy "Users can read messages from visible projects"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations
    join public.projects on projects.id = conversations.project_id
    where conversations.id = messages.conversation_id
      and (projects.user_id = (select auth.uid()) or projects.is_public = true)
  )
);

drop policy if exists "Users can create messages in owned projects" on public.messages;
create policy "Users can create messages in owned projects"
on public.messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.conversations
    join public.projects on projects.id = conversations.project_id
    where conversations.id = messages.conversation_id
      and projects.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update messages in owned projects" on public.messages;
create policy "Users can update messages in owned projects"
on public.messages
for update
to authenticated
using (
  exists (
    select 1
    from public.conversations
    join public.projects on projects.id = conversations.project_id
    where conversations.id = messages.conversation_id
      and projects.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.conversations
    join public.projects on projects.id = conversations.project_id
    where conversations.id = messages.conversation_id
      and projects.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete messages in owned projects" on public.messages;
create policy "Users can delete messages in owned projects"
on public.messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.conversations
    join public.projects on projects.id = conversations.project_id
    where conversations.id = messages.conversation_id
      and projects.user_id = (select auth.uid())
  )
);
