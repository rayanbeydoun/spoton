"use client";

import { useActionState } from "react";
import { savePredictionsAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";
import { LocalTime } from "./LocalTime";

export type FixtureVM = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  kickoffLabel: string;
  home: number | null;
  away: number | null;
};

export function PredictionForm({
  gameweekId,
  leagueId,
  fixtures,
}: {
  gameweekId: string;
  leagueId?: string;
  fixtures: FixtureVM[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    savePredictionsAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="gameweek_id" value={gameweekId} />
      {leagueId && <input type="hidden" name="league_id" value={leagueId} />}

      <ul className="space-y-2">
        {fixtures.map((f) => (
          <li key={f.id} className="card py-3">
            <p className="mb-2 text-center text-xs text-muted">
              <LocalTime iso={f.kickoff} fallback={f.kickoffLabel} withZone />
            </p>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex-1 text-right text-sm font-semibold sm:text-base">
                {f.home_team}
              </div>
              <input
                name={`home_${f.id}`}
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                defaultValue={f.home ?? ""}
                className="input w-14 px-0 text-center"
                aria-label={`${f.home_team} goals`}
              />
              <span className="text-muted">–</span>
              <input
                name={`away_${f.id}`}
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                defaultValue={f.away ?? ""}
                className="input w-14 px-0 text-center"
                aria-label={`${f.away_team} goals`}
              />
              <div className="flex-1 text-left text-sm font-semibold sm:text-base">
                {f.away_team}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {state?.error && <p className="text-sm text-primary">{state.error}</p>}

      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">Save predictions</SubmitButton>
      </div>
    </form>
  );
}
