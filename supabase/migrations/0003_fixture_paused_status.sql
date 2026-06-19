-- =============================================================================
-- Allow a "paused" (half-time) fixture status, so we can show HT vs Ongoing vs FT.
-- Run this in the Supabase SQL editor.
-- =============================================================================

alter table public.fixtures drop constraint if exists fixtures_status_check;
alter table public.fixtures
  add constraint fixtures_status_check
  check (status in ('scheduled', 'live', 'paused', 'finished', 'postponed'));
