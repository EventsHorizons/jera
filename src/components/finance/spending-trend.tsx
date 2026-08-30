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
    <div className="fc-panel">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <p className="text-xs font-medium leading-none text-text-secondary">
          Gastos — últimos 7 días
        </p>
        <p className="font-mono text-xs tabular-nums leading-none text-text-muted">
          {currency}
        </p>
      </div>
      <div className="flex h-24 items-end gap-2">
        {points.map((point) => {
          const height = Math.max((point.value / max) * 100, point.value > 0 ? 8 : 2);
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-20 w-full items-end">
                <div
                  className="w-full rounded-sm bg-primary/75 transition-all"
                  style={{ height: `${height}%` }}
                  title={`${point.label}: ${point.value}`}
                />
              </div>
              <span className="text-xs leading-none text-text-muted">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
