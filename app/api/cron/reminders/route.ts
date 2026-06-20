import { NextResponse } from "next/server";
import { sendDueReminders, sendResultNotifications } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends due prediction reminders. Called by the GitHub Actions scheduler with
 * `Authorization: Bearer ${CRON_SECRET}` (see .github/workflows/cron.yml).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const season = Number(process.env.NEXT_PUBLIC_DEFAULT_SEASON ?? 2025);
  try {
    const reminders = await sendDueReminders(season);
    const results = await sendResultNotifications(season);
    return NextResponse.json({ ok: true, ...reminders, ...results });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
