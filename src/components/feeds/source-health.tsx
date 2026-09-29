import type { FeedHealth } from "@/lib/feeds/types";
import { FeedSourceInfo } from "@/components/feeds/feed-source-info";
import { cn } from "@/lib/utils";

export function SourceHealthGrid({ rows, hubSyncedAt }: { rows: FeedHealth[]; hubSyncedAt?: string }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm gap-1"
        >
          <span className="font-medium truncate">{row.label}</span>
          <span className="flex items-center gap-1 shrink-0">
            <FeedSourceInfo
              sourceId={row.id}
              asOf={row.updatedAt}
              hubSyncedAt={hubSyncedAt}
              healthMessage={row.message}
              name={row.label}
            />
            <span
              className={cn(
                "uppercase tracking-wide text-[10px]",
                row.ok ? "text-emerald-600" : "text-blue-600",
              )}
            >
              {row.ok ? "live" : "degraded"}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
