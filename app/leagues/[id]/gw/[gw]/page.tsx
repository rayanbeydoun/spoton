import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronDown, Trophy, Medal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LocalTime } from "@/components/LocalTime";
import { TeamBadge } from "@/components/TeamBadge";
import { Confetti } from "@/components/Confetti";
import { fmtDateTime } from "@/lib/format";
import { isLocked, type Fixture, type Gameweek, type Prediction } from "@/lib/types";

function pointsClass(p: number | null): string {
  if (p == null) return "text-muted";
  if (p >= 5) return "text-accent font-bold";
  if (p === 4) return "text-accent/80 font-semibold";
  if (p === 3) return "text-foreground font-semibold";
  if (p === 1) return "text-muted";
  return "text-muted/50";
}

/** Live/finished state for a fixture (score is shown separately). */
function StatusLine({ f }: { f: Fixture }) {
  switch (f.status) {
    case "finished":
      return <span className="text-muted">FT</span>;
    case "live":
      return (
        <span className="font-semibold text-primary">
          <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary align-middle" />
          Ongoing
        </span>
      );
    case "paused":
      return <span className="font-semibold text-amber-400">HT</span>;
    case "postponed":
      return <span className="text-muted">Postponed</span>;
    default:
      return <span className="text-muted">Not played yet</span>;
  }
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string; gw: string }>;
}) {
  const { id, gw } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", id)
    .single();
  if (!league) notFound();

  const { data: gwData } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("id", gw)
    .single();
  if (!gwData) notFound();
  const gameweek = gwData as Gameweek;

  // Others' predictions are only readable after the deadline.
  if (!isLocked(gameweek)) redirect(`/predict/${gw}?league=${id}`);

  const { data: memberRows } = await supabase
    .from("league_members")
    .select("user_id, profile:profiles(display_name)")
    .eq("league_id", id);
  const members = (memberRows ?? []).map((m) => ({
    user_id: m.user_id as string,
    name:
      (m.profile as unknown as { display_name: string } | null)?.display_name ??
      "Player",
  }));

  const { data: fixtureData } = await supabase
    .from("fixtures")
    .select("*")
    .eq("gameweek_id", gw)
    .order("kickoff", { ascending: true });
  const fixtures = (fixtureData ?? []) as Fixture[];
  const fixtureIds = fixtures.map((f) => f.id);

  const { data: predData } = fixtureIds.length
    ? await supabase.from("predictions").select("*").in("fixture_id", fixtureIds)
    : { data: [] as Prediction[] };
  const preds = (predData ?? []) as Prediction[];

  // fixture -> user -> prediction
  const cell = new Map<string, Map<string, Prediction>>();
  for (const p of preds) {
    if (!cell.has(p.fixture_id)) cell.set(p.fixture_id, new Map());
    cell.get(p.fixture_id)!.set(p.user_id, p);
  }

  const totals = new Map<string, number>(members.map((m) => [m.user_id, 0]));
  for (const p of preds) {
    if (p.points != null && totals.has(p.user_id)) {
      totals.set(p.user_id, totals.get(p.user_id)! + p.points);
    }
  }

  const standings = members
    .map((m) => ({ ...m, points: totals.get(m.user_id) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  const viewerGotExact = preds.some((p) => p.user_id === user.id && p.points === 5);

  return (
    <div className="space-y-6">
      <Confetti trigger={viewerGotExact} />

      <div>
        <Link
          href={`/leagues/${id}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {league.name}
        </Link>
        <h1 className="text-2xl font-extrabold">Gameweek {gameweek.number}</h1>
        <p className="text-muted">
          Locked{" "}
          {gameweek.deadline ? (
            <LocalTime iso={gameweek.deadline} fallback={fmtDateTime(gameweek.deadline)} />
          ) : (
            "TBD"
          )}
        </p>
      </div>

      {/* Gameweek standings */}
      <section className="card overflow-hidden p-0">
        <h2 className="border-b border-border/70 px-5 py-3 text-lg font-bold">
          Gameweek points
        </h2>
        <ul>
          {standings.map((row, i) => {
            const me = row.user_id === user.id;
            return (
              <li
                key={row.user_id}
                className={`flex items-center gap-3 border-t border-border/50 px-5 py-2.5 ${
                  me ? "bg-surface-2/50" : ""
                }`}
              >
                <span className="flex w-6 shrink-0 justify-center">
                  {i === 0 ? (
                    <Trophy size={16} className="text-gold" aria-label="1st" />
                  ) : i === 1 ? (
                    <Medal size={16} className="text-silver" aria-label="2nd" />
                  ) : i === 2 ? (
                    <Medal size={16} className="text-bronze" aria-label="3rd" />
                  ) : (
                    <span className="tnum text-sm text-muted">{i + 1}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {row.name}
                  {me && <span className="ml-2 text-xs font-normal text-muted">you</span>}
                </span>
                <span className="tnum font-bold text-accent">{row.points}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Matches — tap to reveal everyone's picks (scales to any group size) */}
      <section className="space-y-2">
        <h2 className="text-lg font-bold">Matches</h2>
        <p className="text-xs text-muted">Tap a match to see everyone&apos;s picks.</p>

        {fixtures.map((f) => {
          const hasResult = f.home_score != null && f.away_score != null;
          const mine = cell.get(f.id)?.get(user.id) ?? null;

          const rows = members
            .map((m) => {
              const p = cell.get(f.id)?.get(m.user_id) ?? null;
              return {
                user_id: m.user_id,
                name: m.name,
                pred: p,
                points: p?.points ?? null,
                me: m.user_id === user.id,
              };
            })
            .sort(
              (a, b) =>
                (b.points ?? -1) - (a.points ?? -1) || a.name.localeCompare(b.name),
            );

          return (
            <details key={f.id} className="card group py-3">
              <summary className="flex cursor-pointer list-none select-none flex-col gap-2 [&::-webkit-details-marker]:hidden">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TeamBadge src={f.home_crest} alt={f.home_team} size={20} />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {f.home_team}
                    </span>
                    <span className="tnum text-lg font-bold">
                      {hasResult ? f.home_score : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TeamBadge src={f.away_crest} alt={f.away_team} size={20} />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {f.away_team}
                    </span>
                    <span className="tnum text-lg font-bold">
                      {hasResult ? f.away_score : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <StatusLine f={f} />
                  <span className="flex items-center gap-1.5 text-muted">
                    {mine ? (
                      <>
                        <span>
                          you{" "}
                          <span className="tnum font-mono text-foreground">
                            {mine.home_pred}–{mine.away_pred}
                          </span>
                        </span>
                        <span className={pointsClass(mine.points)}>
                          {mine.points == null ? "" : `${mine.points} pt`}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted/60">no pick</span>
                    )}
                    <ChevronDown
                      size={16}
                      className="transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </span>
                </div>
              </summary>

              <div className="mt-3 space-y-1 border-t border-border/60 pt-3">
                {rows.map((r) => (
                  <div
                    key={r.user_id}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                      r.me ? "bg-surface-2/60" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {r.name}
                      {r.me && <span className="ml-1.5 text-xs text-muted">you</span>}
                    </span>
                    <span className="tnum font-mono">
                      {r.pred ? `${r.pred.home_pred}–${r.pred.away_pred}` : "—"}
                    </span>
                    <span
                      className={`w-12 shrink-0 text-right text-xs ${pointsClass(r.points)}`}
                    >
                      {r.points == null ? "—" : `${r.points} pt`}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
