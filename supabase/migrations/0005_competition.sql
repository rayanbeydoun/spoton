-- =============================================================================
-- Multi-competition support: run World Cup + Premier League side by side.
-- Adds a `competition` dimension to gameweeks + leagues.
-- =============================================================================

alter table public.gameweeks add column if not exists competition text not null default 'PL';
alter table public.leagues   add column if not exists competition text not null default 'PL';

-- Backfill: all existing data is the 2026 World Cup.
update public.gameweeks set competition = 'WC' where season = 2026;
update public.leagues   set competition = 'WC' where season = 2026;

-- Gameweeks are now unique per (competition, season, number) so WC GW1 and PL GW1
-- can coexist in the same season.
alter table public.gameweeks drop constraint if exists gameweeks_season_number_key;
alter table public.gameweeks
  add constraint gameweeks_competition_season_number_key unique (competition, season, number);

-- create_league now takes a competition (defaults to PL).
drop function if exists public.create_league(text, int);
create or replace function public.create_league(
  p_name text,
  p_season int,
  p_competition text default 'PL'
)
returns public.leagues language plpgsql security definer set search_path = public as $$
declare
  new_league public.leagues;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'League name is required'; end if;

  insert into public.leagues (name, invite_code, owner_id, season, competition)
  values (
    trim(p_name),
    public.generate_invite_code(),
    auth.uid(),
    p_season,
    upper(coalesce(nullif(trim(p_competition), ''), 'PL'))
  )
  returning * into new_league;

  insert into public.league_members (league_id, user_id, role)
  values (new_league.id, auth.uid(), 'owner');

  return new_league;
end;
$$;

grant execute on function public.create_league(text, int, text) to authenticated;
