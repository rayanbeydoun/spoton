/** Lightweight loading placeholder shown instantly during navigation. */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="h-7 w-44 animate-pulse rounded-lg bg-surface-2/60" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-2xl border border-border/50 bg-surface/50"
        />
      ))}
    </div>
  );
}
