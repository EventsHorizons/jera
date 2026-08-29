type Point = { label: string; value: number };

export function SpendingTrend({
  points,
  currency,
}: {
  points: Point[];
  currency: string;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="rounded-xl border border-border/80 bg-surface px-4 py-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-xs font-medium text-text-secondary">Gastos — últimos 7 días</p>
        <p className="text-[11px] text-text-muted">{currency}</p>
      </div>
      <div className="flex h-24 items-end gap-1.5">
        {points.map((point) => {
          const height = Math.max((point.value / max) * 100, point.value > 0 ? 8 : 2);
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-20 w-full items-end">
                <div
                  className="w-full rounded-sm bg-zinc-900/90 transition-all"
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${point.value}`}
                />
              </div>
              <span className="text-[10px] text-text-muted">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
