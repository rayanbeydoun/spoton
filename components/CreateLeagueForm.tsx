"use client";

import { useActionState } from "react";
import { createLeagueAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function CreateLeagueForm({ season }: { season: number }) {
  const [state, action] = useActionState<FormState, FormData>(
    createLeagueAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="season" value={season} />
      <div>
        <label className="label" htmlFor="league-name">
          League name
        </label>
        <input
          id="league-name"
          name="name"
          className="input"
          placeholder="The Lads League"
          required
        />
      </div>
      {state?.error && <p className="text-sm text-primary">{state.error}</p>}
      <SubmitButton pendingText="Creating…">Create league</SubmitButton>
    </form>
  );
}
