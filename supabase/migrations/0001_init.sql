-- =============================================================================
-- Premier League Prediction Game — initial schema, RLS, and helper functions.
--
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh project.
-- It is safe to re-run: objects are created with IF NOT EXISTS / OR REPLACE where
-- practical. Scoring of predictions lives in the app (lib/scoring.ts), not here.
-- =============================================================================

-- gen_random_uuid() comes from pgcrypto, available by default on Supabase.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.leagues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  season      int  not null,                       -- 2025 means the 2025/26 season
  created_at  timestamptz not null default now()
);

create table if not exists public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index if not exists league_members_user_idx on public.league_members (user_id);

create table if not exists public.gameweeks (
  id       uuid primary key default gen_random_uuid(),
  season   int  not null,
  number   int  not null,                          -- matchday number
  deadline timestamptz,                            -- first kickoff of the GW; null until known
  status   text not null default 'upcoming' check (status in ('upcoming', 'live', 'finished')),
  unique (season, number)
);

create table if not exists public.fixtures (
  id          uuid primary key default gen_random_uuid(),
  external_id bigint unique,                        -- football-data.org match id (for upsert)
  gameweek_id uuid not null references public.gameweeks (id) on delete cascade,
  home_team   text not null,
  away_team   text not null,
  home_crest  text,
  away_crest  text,
  kickoff     timestamptz not null,
  status      text not null default 'scheduled'
                check (status in ('scheduled', 'live', 'finished', 'postponed')),
  home_score  int,
  away_score  int,
  is_big_match boolean not null default false,      -- reserved for the Big Match double-points feature
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists fixtures_gameweek_idx on public.fixtures (gameweek_id);

create table if not exists public.predictions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  fixture_id   uuid not null references public.fixtures (id) on delete cascade,
  home_pred    int  not null check (home_pred between 0 and 99),
  away_pred    int  not null check (away_pred between 0 and 99),
  points       int,                                 -- null until the fixture is scored
  is_wildcard  boolean not null default false,      -- reserved for the Wildcard feature
  multiplier   int  not null default 1,             -- reserved for Big Match double points
  submitted_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, fixture_id)
);
create index if not exists predictions_fixture_idx on public.predictions (fixture_id);

-- -----------------------------------------------------------------------------
-- updated_at maintenance
-- -----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists fixtures_touch on public.fixtures;
create trigger fixtures_touch before update on public.fixtures
  for each row execute function public.touch_updated_at();

drop trigger if exists predictions_touch on public.predictions;
create trigger predictions_touch before update on public.predictions
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-create a profile when a user signs up (display name defaults to email prefix)
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, 'player'), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- SECURITY DEFINER helpers (used by RLS policies; bypass RLS to avoid recursion)
-- -----------------------------------------------------------------------------

-- Has the deadline for the gameweek containing this fixture passed?
create or replace function public.fixture_deadline_passed(p_fixture uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(g.deadline <= now(), false)
  from public.fixtures f
  join public.gameweeks g on g.id = f.gameweek_id
  where f.id = p_fixture;
$$;

-- Is the current user a member of this league?
create or replace function public.is_league_member(p_league uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league and user_id = auth.uid()
  );
$$;

-- Does the current user share at least one league with the given user?
create or replace function public.shares_league_with(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.league_members me
    join public.league_members them on them.league_id = me.league_id
    where me.user_id = auth.uid() and them.user_id = p_other
  );
$$;

-- -----------------------------------------------------------------------------
-- League create / join (run as definer so they can manage membership safely)
-- -----------------------------------------------------------------------------

create or replace function public.generate_invite_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no ambiguous 0/O/1/I
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.leagues where invite_code = code);
  end loop;
  return code;
end;
$$;

create or replace function public.create_league(p_name text, p_season int)
returns public.leagues language plpgsql security definer set search_path = public as $$
declare
  new_league public.leagues;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'League name is required'; end if;

  insert into public.leagues (name, invite_code, owner_id, season)
  values (trim(p_name), public.generate_invite_code(), auth.uid(), p_season)
  returning * into new_league;

  insert into public.league_members (league_id, user_id, role)
  values (new_league.id, auth.uid(), 'owner');

  return new_league;
end;
$$;

create or replace function public.join_league(p_code text)
returns public.leagues language plpgsql security definer set search_path = public as $$
declare
  target public.leagues;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into target from public.leagues
  where invite_code = upper(trim(p_code));

  if not found then raise exception 'No league found for that invite code'; end if;

  insert into public.league_members (league_id, user_id, role)
  values (target.id, auth.uid(), 'member')
  on conflict (league_id, user_id) do nothing;

  return target;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;
alter table public.gameweeks      enable row level security;
alter table public.fixtures       enable row level security;
alter table public.predictions    enable row level security;

-- profiles: read yourself or anyone you share a league with; manage only yourself.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_league_with(id));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- leagues: visible to members only. Created/joined via SECURITY DEFINER functions.
drop policy if exists leagues_select on public.leagues;
create policy leagues_select on public.leagues for select to authenticated
  using (public.is_league_member(id));

drop policy if exists leagues_update on public.leagues;
create policy leagues_update on public.leagues for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists leagues_delete on public.leagues;
create policy leagues_delete on public.leagues for delete to authenticated
  using (owner_id = auth.uid());

-- league_members: members can see co-members; you can remove yourself.
drop policy if exists league_members_select on public.league_members;
create policy league_members_select on public.league_members for select to authenticated
  using (public.is_league_member(league_id));

drop policy if exists league_members_delete on public.league_members;
create policy league_members_delete on public.league_members for delete to authenticated
  using (user_id = auth.uid());

-- gameweeks & fixtures: any signed-in user can read. Writes happen via the
-- service role (sync job / admin actions), which bypasses RLS.
drop policy if exists gameweeks_select on public.gameweeks;
create policy gameweeks_select on public.gameweeks for select to authenticated using (true);

drop policy if exists fixtures_select on public.fixtures;
create policy fixtures_select on public.fixtures for select to authenticated using (true);

-- predictions: the heart of the anti-cheat rule.
--   * You can always read your own.
--   * You can read others' ONLY after the fixture's deadline has passed AND you
--     share a league with them.
--   * You can write your own ONLY before the deadline.
drop policy if exists predictions_select on public.predictions;
create policy predictions_select on public.predictions for select to authenticated
  using (
    user_id = auth.uid()
    or (public.fixture_deadline_passed(fixture_id) and public.shares_league_with(user_id))
  );

drop policy if exists predictions_insert on public.predictions;
create policy predictions_insert on public.predictions for insert to authenticated
  with check (user_id = auth.uid() and not public.fixture_deadline_passed(fixture_id));

drop policy if exists predictions_update on public.predictions;
create policy predictions_update on public.predictions for update to authenticated
  using (user_id = auth.uid() and not public.fixture_deadline_passed(fixture_id))
  with check (user_id = auth.uid() and not public.fixture_deadline_passed(fixture_id));

drop policy if exists predictions_delete on public.predictions;
create policy predictions_delete on public.predictions for delete to authenticated
  using (user_id = auth.uid() and not public.fixture_deadline_passed(fixture_id));

-- -----------------------------------------------------------------------------
-- Privileges (RLS still applies on top of these grants)
-- -----------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.create_league(text, int)      to authenticated;
grant execute on function public.join_league(text)             to authenticated;
