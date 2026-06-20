"use client";

import { useActionState } from "react";
import { updateDisplayNameAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function DisplayNameForm({ current }: { current: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    updateDisplayNameAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="display_name" className="label">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          className="input"
          defaultValue={current}
          maxLength={40}
          required
        />
      </div>
      {state?.error && <p className="text-sm text-primary">{state.error}</p>}
      {state?.ok && <p className="text-sm text-accent">{state.ok}</p>}
      <SubmitButton pendingText="Saving…">Save name</SubmitButton>
    </form>
  );
}
