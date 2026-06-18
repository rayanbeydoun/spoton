"use client";

import { useActionState } from "react";
import { joinLeagueAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function JoinLeagueForm({ defaultCode = "" }: { defaultCode?: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    joinLeagueAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="invite-code">
          Invite code
        </label>
        <input
          id="invite-code"
          name="code"
          className="input uppercase tracking-widest"
          placeholder="ABC123"
          autoCapitalize="characters"
          defaultValue={defaultCode}
          required
        />
      </div>
      {state?.error && <p className="text-sm text-primary">{state.error}</p>}
      <SubmitButton className="btn-accent" pendingText="Joining…">
        Join league
      </SubmitButton>
    </form>
  );
}
