// Deterministic formatting helpers. Call these in Server Components and pass the
// resulting strings to Client Components to avoid hydration mismatches.

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 2025 -> "2025/26" */
export function seasonLabel(season: number): string {
  const next = (season + 1) % 100;
  return `${season}/${String(next).padStart(2, "0")}`;
}

/** Supported competitions for league creation. */
export const COMPETITIONS: { code: string; name: string }[] = [
  { code: "PL", name: "Premier League" },
  { code: "WC", name: "World Cup" },
];

export function competitionName(code: string): string {
  return COMPETITIONS.find((c) => c.code === code)?.name ?? code;
}

/** e.g. "World Cup 2026" or "Premier League 2026/27". */
export function competitionLabel(code: string, season: number): string {
  if (code === "WC") return `World Cup ${season}`;
  return `${competitionName(code)} ${seasonLabel(season)}`;
}
