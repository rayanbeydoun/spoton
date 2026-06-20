import type { FixtureStatus } from "@/lib/types";

// Thin client for the football-data.org v4 API.
// Docs: https://www.football-data.org/documentation/quickstart
//
// The competition is configurable via FOOTBALL_COMPETITION (default "PL").
// Examples on the free tier: PL (Premier League), WC (FIFA World Cup),
// CL (Champions League), EC (European Championship).

const BASE = "https://api.football-data.org/v4";

export type FdMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage?: string | null;
  homeTeam: { name: string; shortName?: string; crest?: string };
  awayTeam: { name: string; shortName?: string; crest?: string };
  score: { fullTime: { home: number | null; away: number | null } };
};

/** Competitions to sync, from FOOTBALL_COMPETITION (comma-separated, e.g. "WC,PL"). */
export function competitions(): string[] {
  return (process.env.FOOTBALL_COMPETITION || "PL")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

/** Fetch every match for a competition + season (e.g. 2025 => 2025/26 for PL). */
export async function fetchMatches(
  season: number,
  competition: string,
): Promise<FdMatch[]> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_API_KEY is not set");

  const res = await fetch(
    `${BASE}/competitions/${competition}/matches?season=${season}`,
    { headers: { "X-Auth-Token": key }, cache: "no-store" },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { matches?: FdMatch[] };
  return data.matches ?? [];
}

// Cup knockout stages don't have a matchday, so map them to gameweek numbers
// that continue after the group stage (matchdays 1–3).
const KNOCKOUT_ROUND: Record<string, number> = {
  LAST_32: 4,
  LAST_16: 5,
  QUARTER_FINALS: 6,
  SEMI_FINALS: 7,
  THIRD_PLACE: 8,
  FINAL: 8,
};

/**
 * The "gameweek" number for a match: the matchday for league/group games, or a
 * derived number for cup knockout rounds. Returns null if it can't be placed.
 */
export function roundNumber(m: FdMatch): number | null {
  if (m.matchday != null) return m.matchday;
  if (m.stage && KNOCKOUT_ROUND[m.stage] != null) return KNOCKOUT_ROUND[m.stage];
  return null;
}

/** Map a football-data.org status string to our fixture status. */
export function mapStatus(fd: string): FixtureStatus {
  switch (fd) {
    case "FINISHED":
    case "AWARDED":
      return "finished";
    case "IN_PLAY":
      return "live";
    case "PAUSED":
      return "paused"; // half-time
    case "POSTPONED":
    case "SUSPENDED":
    case "CANCELLED":
      return "postponed";
    default:
      return "scheduled"; // SCHEDULED, TIMED
  }
}
