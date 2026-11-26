export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-5" aria-label="Loading records" role="status">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="h-4 w-1/4 animate-pulse rounded bg-line/70" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-line/50" />
          <div className="h-4 w-1/5 animate-pulse rounded bg-line/60" />
        </div>
      ))}
      <span className="sr-only">Loading records…</span>
    </div>
  );
}

export function MetricSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading metrics">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-xl border border-line bg-surface" />
      ))}
      <span className="sr-only">Loading metrics…</span>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-72 animate-pulse rounded-xl border border-line bg-surface" role="status" aria-label="Loading chart">
      <span className="sr-only">Loading chart…</span>
    </div>
  );
}
