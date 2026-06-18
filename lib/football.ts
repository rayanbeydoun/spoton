import type { FixtureStatus } from "@/lib/types";

// Thin client for the football-data.org v4 API (free tier covers the PL).
// Docs: https://www.football-data.org/documentation/quickstart

const BASE = "https://api.football-data.org/v4";

export type FdMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  homeTeam: { name: string; shortName?: string; crest?: string };
  awayTeam: { name: string; shortName?: string; crest?: string };
  score: { fullTime: { home: number | null; away: number | null } };
};

/** Fetch every Premier League match for a season (e.g. 2025 => 2025/26). */
export async function fetchPlMatches(season: number): Promise<FdMatch[]> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_API_KEY is not set");

  const res = await fetch(`${BASE}/competitions/PL/matches?season=${season}`, {
    headers: { "X-Auth-Token": key },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { matches?: FdMatch[] };
  return data.matches ?? [];
}

/** Map a football-data.org status string to our fixture status. */
export function mapStatus(fd: string): FixtureStatus {
  switch (fd) {
    case "FINISHED":
    case "AWARDED":
      return "finished";
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "POSTPONED":
    case "SUSPENDED":
    case "CANCELLED":
      return "postponed";
    default:
      return "scheduled"; // SCHEDULED, TIMED
  }
}
