import { DashboardMetricsSkeleton } from "@/components/finance/dashboard-overview";
import { QuickEntrySkeleton } from "@/components/finance/quick-entry-bar";

export default function DashboardLoading() {
  return (
    <div className="fc-bento-grid">
      <div className="col-span-12 space-y-5 lg:col-span-8">
        <div className="animate-pulse space-y-2">
          <div className="h-5 w-24 rounded bg-zinc-100" />
          <div className="h-4 w-40 rounded bg-zinc-50" />
        </div>
        <QuickEntrySkeleton />
        <DashboardMetricsSkeleton />
      </div>
      <div className="col-span-12 space-y-3 lg:col-span-4">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-100" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-11 animate-pulse rounded-xl border border-zinc-100 bg-zinc-50"
          />
        ))}
      </div>
    </div>
  );
}
