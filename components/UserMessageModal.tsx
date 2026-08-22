"use client";

import { useState, useTransition } from "react";
import { dismissMessage } from "@/app/actions";

export type UserMessage = {
  id: string;
  title: string;
  body: string;
  emoji: string | null;
};

/** Shows admin-authored messages to a specific user as a dismissible popup. */
export function UserMessageModal({ messages }: { messages: UserMessage[] }) {
  const [queue, setQueue] = useState(messages);
  const [pending, startTransition] = useTransition();

  const current = queue[0];
  if (!current) return null;

  function close() {
    const id = current.id;
    startTransition(async () => {
      await dismissMessage(id);
      setQueue((q) => q.slice(1));
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="card-elevated w-full max-w-sm text-center">
        {current.emoji && <div className="mb-2 text-4xl">{current.emoji}</div>}
        <h2 className="text-xl font-extrabold">{current.title}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-muted">{current.body}</p>
        <button
          onClick={close}
          disabled={pending}
          className="btn-primary mt-5 w-full"
        >
          {pending ? "…" : "Got it 😳"}
        </button>
      </div>
    </div>
  );
}
