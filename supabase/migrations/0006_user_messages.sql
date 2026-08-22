-- =============================================================================
-- Targeted in-app messages: admin can drop a popup that a specific user sees on
-- next open (and dismisses). Inserts are service-role/admin only.
-- =============================================================================

create table if not exists public.user_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  title        text not null,
  body         text not null,
  emoji        text,
  created_at   timestamptz not null default now(),
  dismissed_at timestamptz
);
create index if not exists user_messages_open_idx
  on public.user_messages (user_id) where dismissed_at is null;

alter table public.user_messages enable row level security;

drop policy if exists user_messages_select on public.user_messages;
create policy user_messages_select on public.user_messages for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_messages_update on public.user_messages;
create policy user_messages_update on public.user_messages for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, update on public.user_messages to authenticated;
