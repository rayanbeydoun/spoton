import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserGameweeks } from "@/lib/userGameweeks";
import { LocalTime } from "@/components/LocalTime";
import { fmtDateTime } from "@/lib/format";

export default async function ResultsIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const all = await getUserGameweeks(supabase, user.id);
  const locked = all
    .filter((g) => g.locked)
    .sort((a, b) => b.number - a.number);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Results</h1>

      {locked.length === 0 ? (
        <div className="card text-muted">
          No results yet. Once a gameweek locks, everyone&apos;s predictions and
          points show up here.
        </div>
      ) : (
        <ul className="space-y-3">
          {locked.map((g) => (
            <li key={g.id}>
              <Link
                href={`/leagues/${g.leagueId}/gw/${g.id}`}
                className="card flex items-center justify-between gap-3 transition hover:border-accent/60"
              >
                <div className="min-w-0">
                  <p className="font-bold">Gameweek {g.number}</p>
                  <p className="text-xs text-muted">
                    {g.leagueName} · locked{" "}
                    {g.deadline ? (
                      <LocalTime iso={g.deadline} fallback={fmtDateTime(g.deadline)} />
                    ) : (
                      "TBD"
                    )}
                  </p>
                </div>
                <span className="text-muted">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
