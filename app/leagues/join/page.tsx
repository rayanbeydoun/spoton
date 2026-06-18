import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JoinLeagueForm } from "@/components/JoinLeagueForm";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login`);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← My leagues
      </Link>
      <div className="card">
        <h1 className="mb-1 text-xl font-extrabold">Join a league</h1>
        <p className="mb-4 text-sm text-muted">
          Enter the invite code your friend shared with you.
        </p>
        <JoinLeagueForm defaultCode={code ?? ""} />
      </div>
    </div>
  );
}
