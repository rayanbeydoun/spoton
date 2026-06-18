// Shared types mirroring the database schema (supabase/migrations/0001_init.sql).

export type GameweekStatus = "upcoming" | "live" | "finished";
export type FixtureStatus = "scheduled" | "live" | "finished" | "postponed";
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
  number: number;
  deadline: string | null;
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

/** True once the gameweek's deadline has passed (predictions locked / visible). */
export function isLocked(gw: Pick<Gameweek, "deadline">): boolean {
  return gw.deadline !== null && new Date(gw.deadline).getTime() <= Date.now();
}
