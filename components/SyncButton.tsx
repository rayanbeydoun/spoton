"use client";

import { useActionState } from "react";
import { runSyncAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function SyncButton() {
  const [state, action] = useActionState<FormState, FormData>(
    runSyncAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-2">
      <SubmitButton className="btn-accent" pendingText="Syncing…">
        Sync fixtures &amp; results now
      </SubmitButton>
      {state?.ok && <p className="text-sm text-accent">{state.ok}</p>}
      {state?.error && <p className="text-sm text-primary">{state.error}</p>}
    </form>
  );
}
