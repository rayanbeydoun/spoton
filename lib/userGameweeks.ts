import type { SupabaseClient } from "@supabase/supabase-js";
import { isLocked, type Gameweek } from "@/lib/types";

export type UserGameweek = Gameweek & {
  leagueId: string;
  leagueName: string;
  total: number;
  predicted: number;
  locked: boolean;
};

/**
 * Every gameweek relevant to the user (across the seasons of the leagues they're
 * in), annotated with a league for back-links, fixture count, how many they've
 * predicted, and whether it's locked.
 */
export async function getUserGameweeks(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserGameweek[]> {
  const { data: memberships } = await supabase
    .from("league_members")
    .select("league:leagues(id, name, season)")
    .eq("user_id", userId);

  const leagues = (memberships ?? [])
    .map((m) => m.league as unknown as { id: string; name: string; season: number } | null)
    .filter((l): l is { id: string; name: string; season: number } => l != null);
  if (!leagues.length) return [];

  const seasonToLeague = new Map<number, { id: string; name: string }>();
  for (const l of leagues) {
    if (!seasonToLeague.has(l.season)) seasonToLeague.set(l.season, { id: l.id, name: l.name });
  }
  const seasons = [...seasonToLeague.keys()];

  const { data: gwData } = await supabase
    .from("gameweeks")
    .select("*")
    .in("season", seasons)
    .order("number", { ascending: true });
  const gameweeks = (gwData ?? []) as Gameweek[];
  const gwIds = gameweeks.map((g) => g.id);
  if (!gwIds.length) return [];

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("id, gameweek_id")
    .in("gameweek_id", gwIds);
  const totalByGw = new Map<string, number>();
  const gwByFixture = new Map<string, string>();
  for (const f of fixtures ?? []) {
    totalByGw.set(f.gameweek_id, (totalByGw.get(f.gameweek_id) ?? 0) + 1);
    gwByFixture.set(f.id, f.gameweek_id);
  }
  const fixtureIds = (fixtures ?? []).map((f) => f.id);

  const predByGw = new Map<string, number>();
  if (fixtureIds.length) {
    const { data: mine } = await supabase
      .from("predictions")
      .select("fixture_id")
      .eq("user_id", userId)
      .in("fixture_id", fixtureIds);
    for (const p of mine ?? []) {
      const gw = gwByFixture.get(p.fixture_id);
      if (gw) predByGw.set(gw, (predByGw.get(gw) ?? 0) + 1);
    }
  }

  return gameweeks.map((g) => {
    const ctx = seasonToLeague.get(g.season)!;
    return {
      ...g,
      leagueId: ctx.id,
      leagueName: ctx.name,
      total: totalByGw.get(g.id) ?? 0,
      predicted: predByGw.get(g.id) ?? 0,
      locked: isLocked(g),
    };
  });
}
