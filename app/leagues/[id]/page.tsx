import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trophy, Medal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CopyInvite } from "@/components/CopyInvite";
import { LocalTime } from "@/components/LocalTime";
import { Countdown } from "@/components/Countdown";
import { competitionLabel, fmtDateTime } from "@/lib/format";
import { isLocked, type Gameweek } from "@/lib/types";

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: league }, { data: memberRows }] = await Promise.all([
    supabase.from("leagues").select("*").eq("id", id).single(),
    supabase
      .from("league_members")
      .select("user_id, role, profile:profiles(display_name)")
      .eq("league_id", id),
  ]);
  if (!league) notFound();

  const members = (memberRows ?? []).map((m) => ({
    user_id: m.user_id as string,
    name:
      (m.profile as unknown as { display_name: string } | null)?.display_name ??
      "Player",
  }));
  const memberIds = members.map((m) => m.user_id);

  const { data: gwData } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("season", league.season)
    .eq("competition", league.competition)
    .order("number", { ascending: true });
  const gameweeks = (gwData ?? []) as Gameweek[];
  const gwIds = gameweeks.map((g) => g.id);

  const { data: fixtures } = gwIds.length
    ? await supabase
        .from("fixtures")
        .select("id, gameweek_id")
        .in("gameweek_id", gwIds)
    : { data: [] as { id: string; gameweek_id: string }[] };
  const fixtureIds = (fixtures ?? []).map((f) => f.id);
  const fixturesByGw = new Map<string, number>();
  for (const f of fixtures ?? []) {
    fixturesByGw.set(f.gameweek_id, (fixturesByGw.get(f.gameweek_id) ?? 0) + 1);
  }
  const gwByFixture = new Map((fixtures ?? []).map((f) => [f.id, f.gameweek_id]));

  const totals = new Map<string, number>(memberIds.map((m) => [m, 0]));
  const myPredByGw = new Map<string, number>();
  if (fixtureIds.length) {
    const [{ data: pts }, { data: mine }] = await Promise.all([
      supabase
        .from("predictions")
        .select("user_id, points")
        .in("fixture_id", fixtureIds)
        .in("user_id", memberIds)
        .not("points", "is", null),
      supabase
        .from("predictions")
        .select("fixture_id")
        .eq("user_id", user.id)
        .in("fixture_id", fixtureIds),
    ]);
    for (const p of pts ?? []) {
      totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points ?? 0));
    }
    for (const p of mine ?? []) {
      const gw = gwByFixture.get(p.fixture_id);
      if (gw) myPredByGw.set(gw, (myPredByGw.get(gw) ?? 0) + 1);
    }
  }

  const leaderboard = members
    .map((m) => ({ ...m, points: totals.get(m.user_id) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  const nextGw = gameweeks.find(
    (g) => !isLocked(g) && (fixturesByGw.get(g.id) ?? 0) > 0,
  );
  const nextTotal = nextGw ? fixturesByGw.get(nextGw.id) ?? 0 : 0;
  const nextMine = nextGw ? myPredByGw.get(nextGw.id) ?? 0 : 0;
  const nextPct = nextTotal ? Math.round((nextMine / nextTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← My leagues
          </Link>
          <h1 className="text-2xl font-extrabold">{league.name}</h1>
          <p className="text-muted">
            {competitionLabel(league.competition, league.season)}
          </p>
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs text-muted">Invite friends</p>
          <CopyInvite code={league.invite_code} />
        </div>
      </div>

      {nextGw && (
        <section className="card-elevated">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Next up
              </p>
              <p className="text-xl font-extrabold">Gameweek {nextGw.number}</p>
            </div>
            <span className="badge bg-live/15 text-live">
              {nextGw.deadline ? <Countdown iso={nextGw.deadline} /> : "TBD"}
            </span>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-muted">
              <span>Your predictions</span>
              <span className="tnum">
                {nextMine}/{nextTotal}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${nextPct}%` }}
              />
            </div>
          </div>
          <Link
            href={`/predict/${nextGw.id}?league=${league.id}`}
            className="btn-accent mt-4 w-full"
          >
            {nextMine > 0 ? "Edit predictions" : "Make predictions"}
          </Link>
        </section>
      )}

      <section className="card p-0 overflow-hidden">
        <h2 className="border-b border-border/70 px-5 py-3 text-lg font-bold">
          Leaderboard
        </h2>
        <ul>
          {leaderboard.map((row, i) => {
            const me = row.user_id === user.id;
            return (
              <li
                key={row.user_id}
                className={`flex items-center gap-3 border-t border-border/50 px-5 py-3 ${
                  me ? "bg-surface-2/50" : ""
                }`}
              >
                <span className="flex w-6 shrink-0 justify-center">
                  {i === 0 ? (
                    <Trophy size={18} className="text-gold" aria-label="1st" />
                  ) : i === 1 ? (
                    <Medal size={18} className="text-silver" aria-label="2nd" />
                  ) : i === 2 ? (
                    <Medal size={18} className="text-bronze" aria-label="3rd" />
                  ) : (
                    <span className="text-sm text-muted tnum">{i + 1}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {row.name}
                  {me && <span className="ml-2 text-xs font-normal text-muted">you</span>}
                </span>
                <span className="tnum text-lg font-bold text-accent">{row.points}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Gameweeks</h2>
        {gameweeks.length === 0 ? (
          <div className="card text-muted">
            No fixtures loaded yet for{" "}
            {competitionLabel(league.competition, league.season)}. Once the schedule
            is released, an admin syncs it and gameweeks appear here.
          </div>
        ) : (
          <ul className="space-y-2">
            {gameweeks.map((gw) => {
              const locked = isLocked(gw);
              const total = fixturesByGw.get(gw.id) ?? 0;
              const mine = myPredByGw.get(gw.id) ?? 0;
              return (
                <li key={gw.id} className="card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">Gameweek {gw.number}</p>
                    <p className="text-xs text-muted">
                      {locked ? "Locked · " : "Deadline "}
                      {gw.deadline ? (
                        <LocalTime iso={gw.deadline} fallback={fmtDateTime(gw.deadline)} />
                      ) : (
                        "TBD"
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {!locked && (
                      <span className="text-xs text-muted tnum">
                        {mine}/{total}
                      </span>
                    )}
                    {locked ? (
                      <Link
                        href={`/leagues/${league.id}/gw/${gw.id}`}
                        className="btn-ghost px-3 py-1.5 text-sm"
                      >
                        Results
                      </Link>
                    ) : (
                      <Link
                        href={`/predict/${gw.id}?league=${league.id}`}
                        className="btn-primary px-3 py-1.5 text-sm"
                      >
                        {mine > 0 ? "Edit" : "Predict"}
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
