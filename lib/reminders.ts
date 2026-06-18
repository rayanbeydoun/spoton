import { createServiceClient } from "@/lib/supabase/admin";
import { sendPush } from "@/lib/push";

export type ReminderResult = { gameweeksNotified: number; pushesSent: number };

const THREE_HOURS = 3 * 60 * 60 * 1000;
const ONE_HOUR = 1 * 60 * 60 * 1000;

/**
 * Sends "3 hours" and "1 hour" reminders for any gameweek approaching its
 * deadline, only to players (members of a league in that season) who haven't
 * locked in all their predictions. Uses windows + sent-flags so it's safe to
 * call on a loose schedule (e.g. every 15 min) without double-sending.
 */
export async function sendDueReminders(season: number): Promise<ReminderResult> {
  const supabase = createServiceClient();
  const now = Date.now();

  const { data: gws } = await supabase
    .from("gameweeks")
    .select("id, number, deadline, reminder_3h_sent, reminder_1h_sent")
    .eq("season", season)
    .not("deadline", "is", null);

  let gameweeksNotified = 0;
  let pushesSent = 0;

  for (const gw of gws ?? []) {
    const deadline = new Date(gw.deadline as string).getTime();
    if (deadline <= now) continue; // already locked
    const msLeft = deadline - now;

    let kind: "3h" | "1h" | null = null;
    if (!gw.reminder_1h_sent && msLeft <= ONE_HOUR) kind = "1h";
    else if (!gw.reminder_3h_sent && msLeft <= THREE_HOURS) kind = "3h";
    if (!kind) continue;

    const sent = await remindGameweek(
      supabase,
      gw.id as string,
      gw.number as number,
      season,
      kind,
    );
    pushesSent += sent;
    gameweeksNotified++;

    // If we jumped straight to the 1h reminder, also mark 3h so it never fires late.
    const patch =
      kind === "1h"
        ? { reminder_1h_sent: true, reminder_3h_sent: true }
        : { reminder_3h_sent: true };
    await supabase.from("gameweeks").update(patch).eq("id", gw.id);
  }

  return { gameweeksNotified, pushesSent };
}

async function remindGameweek(
  supabase: ReturnType<typeof createServiceClient>,
  gameweekId: string,
  gameweekNumber: number,
  season: number,
  kind: "3h" | "1h",
): Promise<number> {
  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("id")
    .eq("gameweek_id", gameweekId);
  const fixtureIds = (fixtures ?? []).map((f) => f.id);
  const fixtureCount = fixtureIds.length;
  if (!fixtureCount) return 0;

  // Everyone in a league for this season.
  const { data: leagues } = await supabase
    .from("leagues")
    .select("id")
    .eq("season", season);
  const leagueIds = (leagues ?? []).map((l) => l.id);
  if (!leagueIds.length) return 0;

  const { data: memberRows } = await supabase
    .from("league_members")
    .select("user_id")
    .in("league_id", leagueIds);
  const memberIds = [...new Set((memberRows ?? []).map((m) => m.user_id as string))];
  if (!memberIds.length) return 0;

  // Who hasn't predicted every fixture yet?
  const { data: preds } = await supabase
    .from("predictions")
    .select("user_id")
    .in("fixture_id", fixtureIds)
    .in("user_id", memberIds);
  const countByUser = new Map<string, number>();
  for (const p of preds ?? []) {
    countByUser.set(p.user_id, (countByUser.get(p.user_id) ?? 0) + 1);
  }
  const targets = memberIds.filter((uid) => (countByUser.get(uid) ?? 0) < fixtureCount);
  if (!targets.length) return 0;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", targets);
  if (!subs?.length) return 0;

  const hours = kind === "1h" ? "1 hour" : "3 hours";
  const payload = {
    title: `⚽ Gameweek ${gameweekNumber} — get your picks in!`,
    body: `Predictions lock in ${hours}. Tap to finish your gameweek.`,
    url: `/predict/${gameweekId}`,
    tag: `gw-${gameweekId}-${kind}`,
  };

  let sent = 0;
  for (const s of subs) {
    const res = await sendPush(
      { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
      payload,
    );
    if (res.ok) sent++;
    else if (res.gone) await supabase.from("push_subscriptions").delete().eq("id", s.id);
  }
  return sent;
}
