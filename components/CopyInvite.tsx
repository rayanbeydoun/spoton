"use client";

import { useState } from "react";

/** Shows the invite code with a one-click copy of a shareable join link. */
export function CopyInvite({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/leagues/join?code=${code}`
        : code;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — nothing we can do; the code is visible anyway.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="btn-ghost px-3 py-1.5 text-sm"
      title="Copy invite link"
    >
      <span className="font-mono tracking-widest">{code}</span>
      <span className="text-muted">{copied ? "· copied!" : "· copy link"}</span>
    </button>
  );
}
