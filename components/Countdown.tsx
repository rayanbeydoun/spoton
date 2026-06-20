"use client";

import { useEffect, useState } from "react";

function format(ms: number): string {
  if (ms <= 0) return "Locked";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `locks in ${days}d ${hours}h`;
  if (hours > 0) return `locks in ${hours}h ${mins}m`;
  return `locks in ${mins}m`;
}

/** Live "locks in 3h 12m" countdown in the viewer's clock. Turns pink under 3h. */
export function Countdown({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return <span suppressHydrationWarning>…</span>;

  const ms = new Date(iso).getTime() - now;
  const urgent = ms > 0 && ms <= 3 * 60 * 60 * 1000;
  return (
    <span suppressHydrationWarning className={urgent ? "font-semibold text-live" : undefined}>
      {format(ms)}
    </span>
  );
}
