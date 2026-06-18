"use client";

import { useEffect, useState } from "react";

const BASE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Renders a timestamp in the viewer's own timezone. Server-renders the provided
 * `fallback` (a stable UTC string) and swaps to the local-formatted time after
 * mount, so each person sees their own local kick-off/deadline.
 */
export function LocalTime({
  iso,
  fallback = "",
  withZone = false,
}: {
  iso: string;
  fallback?: string;
  withZone?: boolean;
}) {
  const [text, setText] = useState(fallback);

  useEffect(() => {
    const opts = withZone ? { ...BASE_OPTS, timeZoneName: "short" as const } : BASE_OPTS;
    setText(new Date(iso).toLocaleString(undefined, opts));
  }, [iso, withZone]);

  return <span suppressHydrationWarning>{text}</span>;
}
