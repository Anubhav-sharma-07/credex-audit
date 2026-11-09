export function MetricCardSkeleton() {
  return (
    <div className="p-4 bg-surface border border-border rounded-sm shadow-sm space-y-2 animate-pulse">
      <div className="h-3 w-24 bg-canvas-subtle rounded-xs" />
      <div className="h-7 w-36 bg-canvas-subtle rounded-xs" />
      <div className="h-3 w-44 bg-canvas-subtle rounded-xs" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full bg-surface border border-border rounded-sm overflow-hidden animate-pulse">
      <div className="h-9 bg-canvas-subtle border-b border-border flex items-center px-4 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 bg-neutral-3 rounded-xs flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="h-12 flex items-center px-4 gap-4">
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div key={cIdx} className="h-3 bg-canvas-subtle rounded-xs flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="p-5 bg-surface border border-border rounded-sm shadow-sm space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-40 bg-canvas-subtle rounded-xs" />
        <div className="h-4 w-20 bg-canvas-subtle rounded-xs" />
      </div>
      <div className="h-48 bg-canvas-subtle rounded-xs flex items-end gap-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-neutral-3 rounded-xs"
            style={{ height: `${30 + (i * 12) % 60}%` }}
          />
        ))}
      </div>
      <div className="h-3 w-48 bg-canvas-subtle rounded-xs" />
    </div>
  );
}

