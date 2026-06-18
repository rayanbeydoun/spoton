import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LocalTime } from "@/components/LocalTime";
import { TeamBadge } from "@/components/TeamBadge";
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
    ? await supabase
        .from("predictions")
        .select("*")
        .in("fixture_id", fixtureIds)
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/leagues/${id}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← {league.name}
        </Link>
        <h1 className="text-2xl font-extrabold">Gameweek {gameweek.number} results</h1>
        <p className="text-muted">
          Locked{" "}
          {gameweek.deadline ? (
            <LocalTime iso={gameweek.deadline} fallback={fmtDateTime(gameweek.deadline)} />
          ) : (
            "TBD"
          )}
        </p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-muted">
              <th className="sticky left-0 bg-surface px-4 py-3 text-left font-medium">
                Fixture
              </th>
              {members.map((m) => (
                <th key={m.user_id} className="px-3 py-3 text-center font-medium">
                  {m.name}
                  {m.user_id === user.id && (
                    <span className="block text-[10px] text-muted">(you)</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fixtures.map((f) => {
              const hasResult = f.home_score != null && f.away_score != null;
              return (
                <tr key={f.id} className="border-t border-border/60">
                  <td className="sticky left-0 bg-surface px-4 py-3">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <TeamBadge src={f.home_crest} alt={f.home_team} size={18} />
                      <span>{f.home_team}</span>
                      <span className="text-muted">v</span>
                      <TeamBadge src={f.away_crest} alt={f.away_team} size={18} />
                      <span>{f.away_team}</span>
                    </div>
                    <div className="text-xs text-muted">
                      {hasResult
                        ? `Result ${f.home_score}–${f.away_score}`
                        : f.status === "postponed"
                          ? "Postponed"
                          : "Not played yet"}
                    </div>
                  </td>
                  {members.map((m) => {
                    const p = cell.get(f.id)?.get(m.user_id);
                    return (
                      <td key={m.user_id} className="px-3 py-3 text-center">
                        {p ? (
                          <div>
                            <div className="font-mono">
                              {p.home_pred}–{p.away_pred}
                            </div>
                            <div className={`text-xs ${pointsClass(p.points)}`}>
                              {p.points == null ? "—" : `${p.points} pt`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted/50">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-surface-2/40 font-bold">
              <td className="sticky left-0 bg-surface-2/40 px-4 py-3 text-left">
                Gameweek points
              </td>
              {members.map((m) => (
                <td key={m.user_id} className="px-3 py-3 text-center text-accent">
                  {totals.get(m.user_id) ?? 0}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
