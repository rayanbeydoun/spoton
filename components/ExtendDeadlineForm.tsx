"use client";

import { useActionState } from "react";
import { extendDeadlineAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function ExtendDeadlineForm({
  gameweeks,
}: {
  gameweeks: { id: string; number: number; locked: boolean }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    extendDeadlineAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label" htmlFor="gw-extend">
            Gameweek
          </label>
          <select id="gw-extend" name="gameweek_id" className="input" defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {gameweeks.map((g) => (
              <option key={g.id} value={g.id}>
                Gameweek {g.number}
                {g.locked ? " (locked)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24 shrink-0">
          <label className="label" htmlFor="minutes">
            Minutes
          </label>
          <input
            id="minutes"
            name="minutes"
            type="number"
            min={1}
            max={720}
            defaultValue={15}
            className="input tnum text-center"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-primary">{state.error}</p>}
      {state?.ok && <p className="text-sm text-accent">{state.ok}</p>}

      <SubmitButton pendingText="Opening…">Reopen predictions</SubmitButton>
    </form>
  );
}
