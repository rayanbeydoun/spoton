import { createServiceClient } from "@/lib/supabase/admin";
import { fetchPlMatches, mapStatus, type FdMatch } from "@/lib/football";
import { scoreEntry } from "@/lib/scoring";
import type { GameweekStatus } from "@/lib/types";

export type SyncResult = {
  gameweeks: number;
  fixtures: number;
  scored: number;
};

/**
 * Pull the season's fixtures and results from football-data.org, upsert the
 * gameweeks and fixtures, then (re)score predictions for finished matches.
 * Runs with the service role, so it bypasses RLS. Safe to run repeatedly.
 */
export async function syncSeason(season: number): Promise<SyncResult> {
  const supabase = createServiceClient();
  const matches = (await fetchPlMatches(season)).filter((m) => m.matchday != null);

  // 1. Group by matchday and upsert gameweeks (deadline = earliest kickoff).
  const byMatchday = new Map<number, FdMatch[]>();
  for (const m of matches) {
    const list = byMatchday.get(m.matchday!) ?? [];
    list.push(m);
    byMatchday.set(m.matchday!, list);
  }

  const gwRows = [...byMatchday.entries()].map(([number, ms]) => {
    const deadline = ms.reduce(
      (min, m) => (m.utcDate < min ? m.utcDate : min),
      ms[0].utcDate,
    );
    const statuses = ms.map((m) => mapStatus(m.status));
    const status: GameweekStatus = statuses.some((s) => s === "live")
      ? "live"
      : statuses.every((s) => s === "finished" || s === "postponed")
        ? "finished"
        : "upcoming";
    return { season, number, deadline, status };
  });

  if (gwRows.length) {
    const { error } = await supabase
      .from("gameweeks")
      .upsert(gwRows, { onConflict: "season,number" });
    if (error) throw new Error(`gameweeks upsert: ${error.message}`);
  }

  // Resolve matchday -> gameweek id for fixture rows.
  const { data: gws, error: gwErr } = await supabase
    .from("gameweeks")
    .select("id, number")
    .eq("season", season);
  if (gwErr) throw new Error(`gameweeks read: ${gwErr.message}`);
  const gwId = new Map<number, string>((gws ?? []).map((g) => [g.number, g.id]));

  // 2. Upsert fixtures by external_id (preserves existing ids + reserved flags).
  const fixtureRows = matches.map((m) => ({
    external_id: m.id,
    gameweek_id: gwId.get(m.matchday!)!,
    home_team: m.homeTeam.shortName || m.homeTeam.name,
    away_team: m.awayTeam.shortName || m.awayTeam.name,
    home_crest: m.homeTeam.crest ?? null,
    away_crest: m.awayTeam.crest ?? null,
    kickoff: m.utcDate,
    status: mapStatus(m.status),
    home_score: m.score.fullTime.home,
    away_score: m.score.fullTime.away,
  }));

  if (fixtureRows.length) {
    const { error } = await supabase
      .from("fixtures")
      .upsert(fixtureRows, { onConflict: "external_id" });
    if (error) throw new Error(`fixtures upsert: ${error.message}`);
  }

  // 3. Score predictions for finished fixtures.
  const scored = await scoreFinishedFixtures(season);

  return { gameweeks: gwRows.length, fixtures: fixtureRows.length, scored };
}

/**
 * Recompute `predictions.points` for every finished fixture in the season.
 * Idempotent: only writes rows whose points actually changed.
 */
export async function scoreFinishedFixtures(season: number): Promise<number> {
  const supabase = createServiceClient();

  const { data: gws } = await supabase
    .from("gameweeks")
    .select("id, deadline")
    .eq("season", season);
  const gwIds = (gws ?? []).map((g) => g.id);
  if (!gwIds.length) return 0;
  const deadlineByGw = new Map((gws ?? []).map((g) => [g.id, g.deadline as string | null]));

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("id, gameweek_id, home_score, away_score")
    .in("gameweek_id", gwIds)
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null);
  if (!fixtures?.length) return 0;

  const fixtureIds = fixtures.map((f) => f.id);
  const resultById = new Map(
    fixtures.map((f) => [f.id, { home: f.home_score as number, away: f.away_score as number }]),
  );
  const gwByFixture = new Map(fixtures.map((f) => [f.id, f.gameweek_id as string]));

  const { data: preds } = await supabase
    .from("predictions")
    .select("id, fixture_id, home_pred, away_pred, points, submitted_at")
    .in("fixture_id", fixtureIds);
  if (!preds?.length) return 0;

  let updated = 0;
  for (const p of preds) {
    const deadline = deadlineByGw.get(gwByFixture.get(p.fixture_id)!);
    if (!deadline) continue;
    const pts = scoreEntry(
      { home: p.home_pred, away: p.away_pred, submittedAt: p.submitted_at },
      deadline,
      resultById.get(p.fixture_id)!,
    );
    if (pts != null && pts !== p.points) {
      const { error } = await supabase
        .from("predictions")
        .update({ points: pts })
        .eq("id", p.id);
      if (!error) updated++;
    }
  }
  return updated;
}
