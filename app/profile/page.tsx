import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { DisplayNameForm } from "@/components/DisplayNameForm";
import { EnableNotifications } from "@/components/EnableNotifications";

export default async function ProfilePage() {
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

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-extrabold">Profile</h1>

      <div className="card">
        <DisplayNameForm current={profile?.display_name ?? ""} />
        <p className="mt-3 text-xs text-muted">{user.email}</p>
      </div>

      <EnableNotifications />

      {isAdminEmail(user.email) && (
        <Link href="/admin" className="btn-ghost w-full">
          Admin tools
        </Link>
      )}

      <form action="/auth/signout" method="post">
        <button type="submit" className="btn-ghost w-full">
          Sign out
        </button>
      </form>
    </div>
  );
}
