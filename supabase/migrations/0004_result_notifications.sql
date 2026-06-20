-- =============================================================================
-- Result notifications: "match-day done" and "gameweek done" pushes.
-- (Already applied to the live DB via the Supabase tooling.)
-- =============================================================================

alter table public.gameweeks
  add column if not exists results_notified boolean not null default false;

-- Backfill: mark already-complete gameweeks as notified so we don't spam history.
update public.gameweeks g
set results_notified = true
where exists (select 1 from public.fixtures f where f.gameweek_id = g.id)
  and not exists (
    select 1 from public.fixtures f
    where f.gameweek_id = g.id and f.status not in ('finished', 'postponed')
  );

-- Generic dedupe table for one-off notification events (e.g. per match-day).
create table if not exists public.sent_notifications (
  key        text primary key,
  created_at timestamptz not null default now()
);
alter table public.sent_notifications enable row level security;
-- No policies: only the service role (cron) touches it; RLS denies everyone else.
