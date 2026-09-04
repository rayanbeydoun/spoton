-- =============================================================================
-- Admin "reopen predictions" window that the fixture sync can't overwrite.
--
-- Previously the reopen tool moved `gameweeks.deadline`, but the every-5-min sync
-- resets `deadline` to the real first kickoff — silently undoing the extension and
-- causing picks made in the window to be scored as late. This adds a separate
-- `reopen_until` column that the sync never touches.
-- =============================================================================

alter table public.gameweeks add column if not exists reopen_until timestamptz;

-- A fixture is "locked" only if its deadline has passed AND no reopen window is active.
create or replace function public.fixture_deadline_passed(p_fixture uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    g.deadline <= now() and coalesce(g.reopen_until, to_timestamp(0)) <= now(),
    false
  )
  from public.fixtures f
  join public.gameweeks g on g.id = f.gameweek_id
  where f.id = p_fixture;
$$;
