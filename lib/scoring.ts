/**
 * Scoring engine for the Premier League prediction game.
 *
 * Rules (best single tier wins — points do NOT stack):
 *   - Exact scoreline           => 5
 *   - Correct result + correct goal difference (not exact) => 4
 *   - Correct result only       => 3
 *   - Wrong result, but one team's goal count is exactly right => 1
 *   - Anything else             => 0
 *
 * Late or missing predictions score 0 (see {@link scoreEntry}).
 *
 * This module is intentionally pure (no I/O) so it can be unit tested in
 * isolation and reused on both the server (scoring jobs) and the client
 * (showing a provisional score preview).
 */

export type Score = { home: number; away: number };

export const POINTS = {
  EXACT: 5,
  RESULT_AND_GD: 4,
  RESULT_ONLY: 3,
  ONE_TEAM: 1,
  NONE: 0,
} as const;

/** -1 = away win, 0 = draw, 1 = home win. */
function outcome(s: Score): -1 | 0 | 1 {
  return Math.sign(s.home - s.away) as -1 | 0 | 1;
}

/**
 * Points for a single, validly-submitted prediction against a final result.
 * Caller is responsible for late/missing handling — use {@link scoreEntry} for that.
 */
export function scorePrediction(pred: Score, actual: Score): number {
  if (pred.home === actual.home && pred.away === actual.away) {
    return POINTS.EXACT;
  }
  if (outcome(pred) === outcome(actual)) {
    // Same direction; check if the goal difference also matches.
    if (pred.home - pred.away === actual.home - actual.away) {
      return POINTS.RESULT_AND_GD;
    }
    return POINTS.RESULT_ONLY;
  }
  // Wrong result: consolation if exactly one team's goal count is right.
  if (pred.home === actual.home || pred.away === actual.away) {
    return POINTS.ONE_TEAM;
  }
  return POINTS.NONE;
}

export type PredictionInput = {
  home: number;
  away: number;
  /** When the prediction was submitted. Used to enforce the deadline as a backstop. */
  submittedAt: Date | string;
} | null;

/**
 * Score a player's entry for one fixture, accounting for the gameweek deadline
 * and whether the fixture has finished.
 *
 * @returns the points earned, or `null` if the fixture has no final result yet
 *          (so the caller can leave `predictions.points` unscored).
 */
export function scoreEntry(
  prediction: PredictionInput,
  deadline: Date | string,
  result: Score | null,
): number | null {
  if (result === null) return null; // fixture not finished — nothing to score yet
  if (!prediction) return POINTS.NONE; // no prediction submitted
  if (new Date(prediction.submittedAt).getTime() >= new Date(deadline).getTime()) {
    return POINTS.NONE; // submitted at/after kickoff — counts as 0
  }
  return scorePrediction({ home: prediction.home, away: prediction.away }, result);
}
