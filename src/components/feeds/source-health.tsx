import type { FeedHealth } from "@/lib/feeds/types";
import { cn } from "@/lib/utils";

export function SourceHealthGrid({ rows }: { rows: FeedHealth[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          <span className="font-medium">{row.label}</span>
          <span
            className={cn(
              "uppercase tracking-wide",
              row.ok ? "text-emerald-600" : "text-blue-600",
            )}
          >
            {row.ok ? "live" : "degraded"}
          </span>
        </div>
      ))}
    </div>
  );
}
