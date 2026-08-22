"use client";

import { useActionState } from "react";
import { sendUserMessageAction, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function SendMessageForm({
  players,
}: {
  players: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    sendUserMessageAction,
    undefined,
  );

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label" htmlFor="recipient">
          Send to
        </label>
        <select id="recipient" name="recipient" className="input" defaultValue="">
          <option value="" disabled>
            Choose a player…
          </option>
          <option value="ALL">🌍 Everyone</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <div className="w-20 shrink-0">
          <label className="label" htmlFor="emoji">
            Emoji
          </label>
          <input
            id="emoji"
            name="emoji"
            className="input px-0 text-center"
            placeholder="🚨"
            maxLength={4}
          />
        </div>
        <div className="flex-1">
          <label className="label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            className="input"
            placeholder="Nice name… ID please"
            maxLength={80}
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="body">
          Message
        </label>
        <textarea
          id="body"
          name="body"
          className="input min-h-24"
          placeholder="Write the popup message…"
          maxLength={500}
          required
        />
      </div>

      {state?.error && <p className="text-sm text-primary">{state.error}</p>}
      {state?.ok && <p className="text-sm text-accent">{state.ok}</p>}

      <SubmitButton className="btn-accent" pendingText="Sending…">
        Send popup
      </SubmitButton>
    </form>
  );
}
