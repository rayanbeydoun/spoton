// Shared types mirroring the database schema (supabase/migrations/0001_init.sql).

export type GameweekStatus = "upcoming" | "live" | "finished";
export type FixtureStatus =
  | "scheduled"
  | "live"
  | "paused"
  | "finished"
  | "postponed";
export type MemberRole = "owner" | "member";

export type Profile = {
  id: string;
  display_name: string;
  created_at: string;
};

export type League = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  season: number;
  competition: string;
  created_at: string;
};

export type LeagueMember = {
  league_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
};

export type Gameweek = {
  id: string;
  season: number;
  competition: string;
  number: number;
  deadline: string | null;
  reopen_until: string | null;
  status: GameweekStatus;
};

export type Fixture = {
  id: string;
  external_id: number | null;
  gameweek_id: string;
  home_team: string;
  away_team: string;
  home_crest: string | null;
  away_crest: string | null;
  kickoff: string;
  status: FixtureStatus;
  home_score: number | null;
  away_score: number | null;
  is_big_match: boolean;
  created_at: string;
  updated_at: string;
};

export type Prediction = {
  id: string;
  user_id: string;
  fixture_id: string;
  home_pred: number;
  away_pred: number;
  points: number | null;
  is_wildcard: boolean;
  multiplier: number;
  submitted_at: string;
  updated_at: string;
};

/**
 * True once predictions are locked: the deadline has passed AND there's no active
 * admin reopen window.
 */
export function isLocked(
  gw: Pick<Gameweek, "deadline"> & { reopen_until?: string | null },
): boolean {
  if (gw.deadline === null) return false;
  if (new Date(gw.deadline).getTime() > Date.now()) return false;
  if (gw.reopen_until && new Date(gw.reopen_until).getTime() > Date.now()) return false;
  return true;
}

/** The effective cut-off for a gameweek: the later of its deadline and any reopen window. */
export function effectiveDeadline(
  gw: Pick<Gameweek, "deadline"> & { reopen_until?: string | null },
): string | null {
  if (!gw.deadline) return gw.reopen_until ?? null;
  if (gw.reopen_until && new Date(gw.reopen_until) > new Date(gw.deadline)) {
    return gw.reopen_until;
  }
  return gw.deadline;
}
