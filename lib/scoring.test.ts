import { describe, expect, it } from "vitest";
import { POINTS, scoreEntry, scorePrediction } from "./scoring";

describe("scorePrediction (best single tier)", () => {
  it("awards 5 for an exact scoreline", () => {
    expect(scorePrediction({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe(POINTS.EXACT);
  });

  it("awards 5 for an exact draw", () => {
    expect(scorePrediction({ home: 1, away: 1 }, { home: 1, away: 1 })).toBe(POINTS.EXACT);
  });

  it("awards 4 for correct result and goal difference (non-draw)", () => {
    // both home win by 1
    expect(scorePrediction({ home: 2, away: 1 }, { home: 3, away: 2 })).toBe(POINTS.RESULT_AND_GD);
  });

  it("awards 4 for correct draw with wrong scoreline (GD both 0)", () => {
    expect(scorePrediction({ home: 1, away: 1 }, { home: 2, away: 2 })).toBe(POINTS.RESULT_AND_GD);
  });

  it("awards 3 for correct result only (the 2-0 vs 3-0 example)", () => {
    // home win predicted, home win happened, GD differs (2 vs 3), away goals happen to match
    // but best-single-tier => result only = 3, NOT stacked with the one-team bonus
    expect(scorePrediction({ home: 2, away: 0 }, { home: 3, away: 0 })).toBe(POINTS.RESULT_ONLY);
  });

  it("awards 3 for correct result only (away win, different GD)", () => {
    expect(scorePrediction({ home: 0, away: 1 }, { home: 1, away: 3 })).toBe(POINTS.RESULT_ONLY);
  });

  it("awards 1 for wrong result but one team's goals exactly right (home)", () => {
    // predicted home win 2-1, actual draw 2-2 -> wrong result, home goals match
    expect(scorePrediction({ home: 2, away: 1 }, { home: 2, away: 2 })).toBe(POINTS.ONE_TEAM);
  });

  it("awards 1 for wrong result but one team's goals exactly right (away)", () => {
    // predicted home win 2-1, actual away win 0-1 -> wrong result, away goals match
    expect(scorePrediction({ home: 2, away: 1 }, { home: 0, away: 1 })).toBe(POINTS.ONE_TEAM);
  });

  it("awards 0 when nothing matches", () => {
    expect(scorePrediction({ home: 2, away: 1 }, { home: 0, away: 3 })).toBe(POINTS.NONE);
  });
});

describe("scoreEntry (deadline + result handling)", () => {
  const deadline = new Date("2026-08-15T11:30:00Z");
  const result = { home: 2, away: 1 };

  it("returns null when the fixture has no final result yet", () => {
    const pred = { home: 2, away: 1, submittedAt: new Date("2026-08-15T10:00:00Z") };
    expect(scoreEntry(pred, deadline, null)).toBeNull();
  });

  it("returns 0 when there is no prediction", () => {
    expect(scoreEntry(null, deadline, result)).toBe(POINTS.NONE);
  });

  it("scores normally when submitted before the deadline", () => {
    const pred = { home: 2, away: 1, submittedAt: new Date("2026-08-15T10:00:00Z") };
    expect(scoreEntry(pred, deadline, result)).toBe(POINTS.EXACT);
  });

  it("returns 0 for a late submission (at or after kickoff)", () => {
    const pred = { home: 2, away: 1, submittedAt: new Date("2026-08-15T11:30:00Z") };
    expect(scoreEntry(pred, deadline, result)).toBe(POINTS.NONE);
  });

  it("accepts ISO string inputs", () => {
    const pred = { home: 2, away: 1, submittedAt: "2026-08-15T10:00:00Z" };
    expect(scoreEntry(pred, "2026-08-15T11:30:00Z", result)).toBe(POINTS.EXACT);
  });
});
