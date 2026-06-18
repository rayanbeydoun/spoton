import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PredictionForm, type FixtureVM } from "@/components/PredictionForm";
import { LocalTime } from "@/components/LocalTime";
import { fmtDateTime } from "@/lib/format";
import { isLocked, type Fixture, type Gameweek, type Prediction } from "@/lib/types";

export default async function PredictPage({
  params,
  searchParams,
}: {
  params: Promise<{ gw: string }>;
  searchParams: Promise<{ league?: string; saved?: string }>;
}) {
  const { gw } = await params;
  const { league } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gameweek } = await supabase
    .from("gameweeks")
    .select("*")
    .eq("id", gw)
    .single();
  if (!gameweek) notFound();
  const gameweekRow = gameweek as Gameweek;

  // Locked? Send to results if we know the league, otherwise explain.
  if (isLocked(gameweekRow)) {
    if (league) redirect(`/leagues/${league}/gw/${gw}`);
  }

  const { data: fixtureData } = await supabase
    .from("fixtures")
    .select("*")
    .eq("gameweek_id", gw)
    .order("kickoff", { ascending: true });
  const fixtures = (fixtureData ?? []) as Fixture[];

  const { data: predData } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", user.id)
    .in(
      "fixture_id",
      fixtures.map((f) => f.id),
    );
  const predByFixture = new Map(
    ((predData ?? []) as Prediction[]).map((p) => [p.fixture_id, p]),
  );

  const vms: FixtureVM[] = fixtures.map((f) => ({
    id: f.id,
    home_team: f.home_team,
    away_team: f.away_team,
    kickoff: f.kickoff,
    kickoffLabel: fmtDateTime(f.kickoff),
    home: predByFixture.get(f.id)?.home_pred ?? null,
    away: predByFixture.get(f.id)?.away_pred ?? null,
  }));

  const locked = isLocked(gameweekRow);
  const backHref = league ? `/leagues/${league}` : "/";

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="text-sm text-muted hover:text-foreground">
          ← Back
        </Link>
        <h1 className="text-2xl font-extrabold">Gameweek {gameweekRow.number}</h1>
        <p className="text-muted">
          {locked ? "Locked · " : "Predictions lock at "}
          {gameweekRow.deadline ? (
            <LocalTime
              iso={gameweekRow.deadline}
              fallback={fmtDateTime(gameweekRow.deadline)}
              withZone
            />
          ) : (
            "TBD"
          )}
        </p>
      </div>

      {locked ? (
        <div className="card text-muted">
          This gameweek is locked. Predictions can no longer be changed.
          {league && (
            <Link
              href={`/leagues/${league}/gw/${gw}`}
              className="ml-1 text-accent hover:underline"
            >
              View results →
            </Link>
          )}
        </div>
      ) : fixtures.length === 0 ? (
        <div className="card text-muted">No fixtures in this gameweek yet.</div>
      ) : (
        <PredictionForm gameweekId={gw} leagueId={league} fixtures={vms} />
      )}
    </div>
  );
}
