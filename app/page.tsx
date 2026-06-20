import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateLeagueForm } from "@/components/CreateLeagueForm";
import { JoinLeagueForm } from "@/components/JoinLeagueForm";
import { EnableNotifications } from "@/components/EnableNotifications";
import { competitionLabel } from "@/lib/format";
import type { League } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("league_members")
    .select("role, league:leagues(id, name, invite_code, season, competition)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  const leagues = (memberships ?? [])
    .map((m) => m.league as unknown as League | null)
    .filter((l): l is League => l != null);

  const defaultSeason = Number(process.env.NEXT_PUBLIC_DEFAULT_SEASON ?? 2025);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">
          Hi {profile?.display_name ?? "there"} 👋
        </h1>
        <p className="text-muted">Your prediction leagues</p>
      </div>

      <EnableNotifications />

      {leagues.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map((l) => (
            <Link
              key={l.id}
              href={`/leagues/${l.id}`}
              className="card transition hover:border-primary/60"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-bold">{l.name}</h2>
                <span className="badge bg-surface-2 text-muted">
                  {competitionLabel(l.competition, l.season)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Invite code{" "}
                <span className="font-mono text-foreground">{l.invite_code}</span>
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-muted">
          You&apos;re not in any leagues yet. Create one and share the invite code,
          or join a friend&apos;s league below.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 text-lg font-bold">Create a league</h3>
          <CreateLeagueForm season={defaultSeason} />
        </div>
        <div className="card">
          <h3 className="mb-3 text-lg font-bold">Join a league</h3>
          <JoinLeagueForm />
        </div>
      </div>
    </div>
  );
}
