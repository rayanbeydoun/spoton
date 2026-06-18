"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { scoreFinishedFixtures, syncSeason } from "@/lib/sync";
import type { FixtureStatus } from "@/lib/types";

export type FormState = { error?: string; ok?: string } | undefined;

function defaultSeason(): number {
  return Number(process.env.NEXT_PUBLIC_DEFAULT_SEASON ?? 2025);
}

// --- Leagues -----------------------------------------------------------------

export async function createLeagueAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let leagueId: string;
  try {
    const name = String(formData.get("name") ?? "").trim();
    const season = Number(formData.get("season") ?? defaultSeason());
    if (!name) return { error: "Please enter a league name." };

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_league", {
      p_name: name,
      p_season: season,
    });
    if (error) return { error: error.message };
    leagueId = data.id;
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/");
  redirect(`/leagues/${leagueId}`);
}

export async function joinLeagueAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let leagueId: string;
  try {
    const code = String(formData.get("code") ?? "").trim();
    if (!code) return { error: "Please enter an invite code." };

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("join_league", { p_code: code });
    if (error) return { error: error.message };
    leagueId = data.id;
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/");
  redirect(`/leagues/${leagueId}`);
}

// --- Predictions -------------------------------------------------------------

export async function savePredictionsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let leagueId = "";
  let gameweekId = "";
  try {
    gameweekId = String(formData.get("gameweek_id") ?? "");
    leagueId = String(formData.get("league_id") ?? "");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: fixtures } = await supabase
      .from("fixtures")
      .select("id")
      .eq("gameweek_id", gameweekId);

    const now = new Date().toISOString();
    const rows: {
      user_id: string;
      fixture_id: string;
      home_pred: number;
      away_pred: number;
      submitted_at: string;
    }[] = [];

    for (const f of fixtures ?? []) {
      const h = formData.get(`home_${f.id}`);
      const a = formData.get(`away_${f.id}`);
      if (h == null || a == null || h === "" || a === "") continue;
      rows.push({
        user_id: user.id,
        fixture_id: f.id,
        home_pred: Math.max(0, Math.min(99, Math.trunc(Number(h)))),
        away_pred: Math.max(0, Math.min(99, Math.trunc(Number(a)))),
        submitted_at: now,
      });
    }

    if (!rows.length) return { error: "Enter at least one score before saving." };

    const { error } = await supabase
      .from("predictions")
      .upsert(rows, { onConflict: "user_id,fixture_id" });
    if (error) {
      return {
        error: error.message.includes("row-level security")
          ? "This gameweek is locked — the deadline has passed."
          : error.message,
      };
    }
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath(`/predict/${gameweekId}`);
  redirect(leagueId ? `/leagues/${leagueId}` : `/predict/${gameweekId}?saved=1`);
}

// --- Admin -------------------------------------------------------------------

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) throw new Error("Not authorized.");
}

export async function runSyncAction(_prev: FormState): Promise<FormState> {
  try {
    await requireAdmin();
    const r = await syncSeason(defaultSeason());
    revalidatePath("/admin");
    return { ok: `Synced ${r.gameweeks} gameweeks, ${r.fixtures} fixtures, scored ${r.scored} predictions.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function updateFixtureAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireAdmin();

    const id = String(formData.get("fixture_id") ?? "");
    const status = String(formData.get("status") ?? "scheduled") as FixtureStatus;
    const homeRaw = formData.get("home_score");
    const awayRaw = formData.get("away_score");
    const home_score = homeRaw == null || homeRaw === "" ? null : Math.trunc(Number(homeRaw));
    const away_score = awayRaw == null || awayRaw === "" ? null : Math.trunc(Number(awayRaw));

    const service = createServiceClient();
    const { error } = await service
      .from("fixtures")
      .update({ status, home_score, away_score })
      .eq("id", id);
    if (error) return { error: error.message };

    await scoreFinishedFixtures(defaultSeason());
    revalidatePath("/admin");
    return { ok: "Fixture updated." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
