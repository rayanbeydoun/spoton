import { NextResponse } from "next/server";
import { syncSeason } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled fixture/result sync. Triggered by Vercel Cron (see vercel.json),
 * which sends `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const season = Number(
    process.env.NEXT_PUBLIC_DEFAULT_SEASON ?? new Date().getFullYear(),
  );

  try {
    const result = await syncSeason(season);
    return NextResponse.json({ ok: true, season, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  }
}
