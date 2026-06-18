import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { SyncButton } from "@/components/SyncButton";
import { FixtureEditForm } from "@/components/FixtureEditForm";
import { fmtDateTime, seasonLabel } from "@/lib/format";
import type { Fixture, FixtureStatus, Gameweek } from "@/lib/types";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!isAdminEmail(user.email)) {
    return (
      <div className="card text-muted">
        This page is for league admins only. If you should have access, ask for your
        email to be added to <span className="font-mono">ADMIN_EMAILS</span>.
        <div className="mt-3">
          <Link href="/" className="text-accent hover:underline">
            ← Back to my leagues
          </Link>
        </div>
      </div>
    );
  }

  const season = Number(process.env.NEXT_PUBLIC_DEFAULT_SEASON ?? 2025);

  const { data: gwData } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("season", season)
    .order("number", { ascending: true });
  const gameweeks = (gwData ?? []) as Gameweek[];

  const { data: fixtureData } = gameweeks.length
    ? await supabase
        .from("fixtures")
        .select("*")
        .in(
          "gameweek_id",
          gameweeks.map((g) => g.id),
        )
        .order("kickoff", { ascending: true })
    : { data: [] as Fixture[] };
  const fixtures = (fixtureData ?? []) as Fixture[];
  const byGw = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    if (!byGw.has(f.gameweek_id)) byGw.set(f.gameweek_id, []);
    byGw.get(f.gameweek_id)!.push(f);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Admin</h1>
        <p className="text-muted">Season {seasonLabel(season)}</p>
      </div>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold">Fixtures &amp; results</h2>
        <p className="text-sm text-muted">
          Pull the latest schedule and scores from football-data.org. Results are
          scored automatically. Re-run any time — it&apos;s safe.
        </p>
        <SyncButton />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Manual overrides</h2>
        <p className="text-sm text-muted">
          For postponed/rescheduled games or to correct a score the API got wrong.
          Saving re-scores affected predictions.
        </p>

        {gameweeks.length === 0 ? (
          <div className="card text-muted">
            No gameweeks yet. Run a sync above once the season schedule is out.
          </div>
        ) : (
          gameweeks.map((gw) => {
            const fx = byGw.get(gw.id) ?? [];
            if (fx.length === 0) return null;
            return (
              <details key={gw.id} className="card">
                <summary className="cursor-pointer font-semibold">
                  Gameweek {gw.number}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {statusSummary(fx)} · deadline {fmtDateTime(gw.deadline)}
                  </span>
                </summary>
                <div className="mt-4 space-y-3">
                  {fx.map((f) => (
                    <FixtureEditForm
                      key={f.id}
                      fixture={{
                        id: f.id,
                        home_team: f.home_team,
                        away_team: f.away_team,
                        status: f.status as FixtureStatus,
                        home_score: f.home_score,
                        away_score: f.away_score,
                      }}
                    />
                  ))}
                </div>
              </details>
            );
          })
        )}
      </section>
    </div>
  );
}

function statusSummary(fixtures: Fixture[]): string {
  const finished = fixtures.filter((f) => f.status === "finished").length;
  return `${finished}/${fixtures.length} played`;
}
