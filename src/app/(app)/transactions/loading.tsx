export default function TransactionsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-36 rounded bg-zinc-100" />
        <div className="h-4 w-48 rounded bg-zinc-50" />
      </div>
      <div className="h-10 rounded-xl bg-zinc-100" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl border border-zinc-100 bg-zinc-50" />
        ))}
      </div>
    </div>
  );
}
