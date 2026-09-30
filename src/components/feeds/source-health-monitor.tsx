import { cn } from "@/lib/utils";

export interface MonitoredSource {
  id: string;
  label: string;
  category: string;
  lastOk: string | null;
  lastError: string | null;
  lastRun: string | null;
  failStreak: number;
  status: "healthy" | "degraded" | "failing" | "unknown";
  detail: string | null;
}

function pillClass(status: MonitoredSource["status"], notConnected: boolean): string {
  if (notConnected) return "text-muted-foreground";
  switch (status) {
    case "healthy":
      return "text-emerald-600";
    case "degraded":
      return "text-amber-600";
    case "failing":
      return "text-rose-600";
    default:
      return "text-muted-foreground";
  }
}

function pillLabel(status: MonitoredSource["status"], notConnected: boolean): string {
  if (notConnected) return "not connected";
  return status;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

/**
 * Persisted source-health monitor: collectors + feed-hub sources, derived only
 * from recorded runs (GET /api/health/sources). Honest states only — a source
 * that never reported shows "unknown", never "healthy".
 */
export function SourceHealthMonitor({ sources }: { sources: MonitoredSource[] }) {
  if (!sources.length) {
    return <p className="text-sm text-muted-foreground">No recorded source health yet — the monitor populates as scheduled collectors and the feed-hub warm cron run.</p>;
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sources.map((s) => {
        const notConnected = (s.detail ?? "").startsWith("Not configured");
        return (
          <div
            key={s.id}
            className="flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm"
            title={s.lastError ? `Last error: ${s.lastError}` : undefined}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-medium truncate">{s.label}</span>
              <span className={cn("uppercase tracking-wide text-[10px] shrink-0", pillClass(s.status, notConnected))}>
                {pillLabel(s.status, notConnected)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {s.failStreak > 0 ? (
                <span>
                  {s.failStreak} consecutive failure{s.failStreak === 1 ? "" : "s"}
                  {s.lastError ? ` · ${s.lastError}` : ""}
                </span>
              ) : (
                <span>Last ok · {formatTime(s.lastOk)}</span>
              )}
              {s.detail ? <span> · {s.detail}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
