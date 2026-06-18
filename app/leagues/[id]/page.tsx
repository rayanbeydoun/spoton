import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CopyInvite } from "@/components/CopyInvite";
import { fmtDateTime, seasonLabel } from "@/lib/format";
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

  const { data: league } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", id)
    .single();
  if (!league) notFound();

  // Members + display names.
  const { data: memberRows } = await supabase
    .from("league_members")
    .select("user_id, role, profile:profiles(display_name)")
    .eq("league_id", id);
  const members = (memberRows ?? []).map((m) => ({
    user_id: m.user_id as string,
    role: m.role as string,
    name:
      (m.profile as unknown as { display_name: string } | null)?.display_name ??
      "Player",
  }));
  const memberIds = members.map((m) => m.user_id);

  // Gameweeks for this season.
  const { data: gwData } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("season", league.season)
    .order("number", { ascending: true });
  const gameweeks = (gwData ?? []) as Gameweek[];
  const gwIds = gameweeks.map((g) => g.id);

  // Fixtures for those gameweeks.
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

  // Leaderboard: total points per member (only finished fixtures have points).
  const totals = new Map<string, number>(memberIds.map((m) => [m, 0]));
  if (fixtureIds.length) {
    const { data: pts } = await supabase
      .from("predictions")
      .select("user_id, points")
      .in("fixture_id", fixtureIds)
      .in("user_id", memberIds)
      .not("points", "is", null);
    for (const p of pts ?? []) {
      totals.set(p.user_id, (totals.get(p.user_id) ?? 0) + (p.points ?? 0));
    }
  }

  // My predictions, to show "predicted X/Y" per gameweek.
  const myPredByGw = new Map<string, number>();
  if (fixtureIds.length) {
    const { data: mine } = await supabase
      .from("predictions")
      .select("fixture_id")
      .eq("user_id", user.id)
      .in("fixture_id", fixtureIds);
    for (const p of mine ?? []) {
      const gw = gwByFixture.get(p.fixture_id);
      if (gw) myPredByGw.set(gw, (myPredByGw.get(gw) ?? 0) + 1);
    }
  }

  const leaderboard = members
    .map((m) => ({ ...m, points: totals.get(m.user_id) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← My leagues
          </Link>
          <h1 className="text-2xl font-extrabold">{league.name}</h1>
          <p className="text-muted">Season {seasonLabel(league.season)}</p>
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs text-muted">Invite friends</p>
          <CopyInvite code={league.invite_code} />
        </div>
      </div>

      {/* Leaderboard */}
      <section className="card p-0 overflow-hidden">
        <h2 className="border-b border-border px-5 py-3 text-lg font-bold">
          Leaderboard
        </h2>
        <table className="w-full text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-5 py-2 text-left font-medium">#</th>
              <th className="px-5 py-2 text-left font-medium">Player</th>
              <th className="px-5 py-2 text-right font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row, i) => (
              <tr
                key={row.user_id}
                className={`border-t border-border/60 ${
                  row.user_id === user.id ? "bg-surface-2/40" : ""
                }`}
              >
                <td className="px-5 py-2.5 text-muted">{i + 1}</td>
                <td className="px-5 py-2.5 font-semibold">
                  {row.name}
                  {row.user_id === user.id && (
                    <span className="ml-2 text-xs text-muted">(you)</span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-right font-bold text-accent">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Gameweeks */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Gameweeks</h2>
        {gameweeks.length === 0 ? (
          <div className="card text-muted">
            No fixtures loaded yet for {seasonLabel(league.season)}. Once the schedule
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
                  <div>
                    <p className="font-bold">Gameweek {gw.number}</p>
                    <p className="text-xs text-muted">
                      {locked ? "Locked · " : "Deadline "}
                      {fmtDateTime(gw.deadline)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!locked && (
                      <span className="text-xs text-muted">
                        {mine}/{total} predicted
                      </span>
                    )}
                    {locked ? (
                      <Link
                        href={`/leagues/${league.id}/gw/${gw.id}`}
                        className="btn-ghost px-3 py-1.5 text-sm"
                      >
                        View results
                      </Link>
                    ) : (
                      <Link
                        href={`/predict/${gw.id}?league=${league.id}`}
                        className="btn-primary px-3 py-1.5 text-sm"
                      >
                        {mine > 0 ? "Edit picks" : "Predict"}
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
