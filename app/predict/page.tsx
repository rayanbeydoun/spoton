import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserGameweeks } from "@/lib/userGameweeks";
import { Countdown } from "@/components/Countdown";

export default async function PredictIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const all = await getUserGameweeks(supabase, user.id);
  const open = all
    .filter((g) => !g.locked && g.total > 0)
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Predict</h1>

      {open.length === 0 ? (
        <div className="card text-muted">
          No open gameweeks right now. When the next deadline approaches, it&apos;ll
          appear here to predict.
        </div>
      ) : (
        <ul className="space-y-3">
          {open.map((g) => {
            const done = g.predicted >= g.total;
            return (
              <li key={g.id}>
                <Link
                  href={`/predict/${g.id}?league=${g.leagueId}`}
                  className="card flex items-center justify-between gap-3 transition hover:border-accent/60"
                >
                  <div className="min-w-0">
                    <p className="font-bold">Gameweek {g.number}</p>
                    <p className="text-xs text-muted">
                      {g.deadline ? <Countdown iso={g.deadline} /> : "TBD"} ·{" "}
                      <span className="tnum">
                        {g.predicted}/{g.total}
                      </span>{" "}
                      predicted
                    </p>
                  </div>
                  <span
                    className={`badge shrink-0 ${
                      done
                        ? "bg-accent/15 text-accent"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {done ? "Done" : "Predict"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
