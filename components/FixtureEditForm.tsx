"use client";

import { useActionState } from "react";
import { updateFixtureAction, type FormState } from "@/app/actions";
import type { FixtureStatus } from "@/lib/types";
import { SubmitButton } from "./SubmitButton";

const STATUSES: FixtureStatus[] = ["scheduled", "live", "finished", "postponed"];

export function FixtureEditForm({
  fixture,
}: {
  fixture: {
    id: string;
    home_team: string;
    away_team: string;
    status: FixtureStatus;
    home_score: number | null;
    away_score: number | null;
  };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    updateFixtureAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="fixture_id" value={fixture.id} />
      <span className="min-w-0 flex-1 truncate">
        {fixture.home_team} v {fixture.away_team}
      </span>
      <input
        name="home_score"
        type="number"
        min={0}
        max={99}
        defaultValue={fixture.home_score ?? ""}
        className="input w-12 px-0 text-center"
        aria-label="home score"
      />
      <input
        name="away_score"
        type="number"
        min={0}
        max={99}
        defaultValue={fixture.away_score ?? ""}
        className="input w-12 px-0 text-center"
        aria-label="away score"
      />
      <select
        name="status"
        defaultValue={fixture.status}
        className="input w-32"
        aria-label="status"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <SubmitButton className="btn-ghost px-3 py-1.5" pendingText="…">
        Save
      </SubmitButton>
      {state?.error && <p className="w-full text-primary">{state.error}</p>}
    </form>
  );
}
