"use client";

import { useEffect, useState } from "react";
import { Maximize2, Power } from "lucide-react";
import { fetchJSON, postJSON, type LiveState } from "@/lib/ai-trader/api";
import { useTradingMode } from "@/components/ai-trader/contexts/TradingModeContext";
import { useFullscreenPnl } from "@/components/ai-trader/algo-providers";
import { cn } from "@/lib/utils";

/** Horizontal controls (was dark sidebar footer): mode, system power, status. */
export function AlgoDeskControls() {
  const [status, setStatus] = useState<string>("connecting");
  const [enabled, setEnabled] = useState(true);
  const [toggling, setToggling] = useState(false);
  const { mode, setMode } = useTradingMode();
  const { show: onFullscreenPnl } = useFullscreenPnl();

  useEffect(() => {
    const poll = () => {
      fetchJSON<LiveState>("/api/state")
        .then((d) => {
          setStatus(d.status);
          setEnabled(d.scanner_enabled ?? true);
        })
        .catch(() => setStatus("offline"));
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, []);

  const toggleSystem = async () => {
    setToggling(true);
    try {
      const endpoint = enabled ? "/api/system/stop" : "/api/system/start";
      await postJSON(endpoint);
      setEnabled(!enabled);
      setStatus(enabled ? "stopped" : "idle");
    } catch {
      /* ignore */
    }
    setToggling(false);
  };

  const statusLabel =
    status === "scanning"
      ? "Scanning"
      : status === "idle"
        ? "Idle"
        : status === "stopped"
          ? "Stopped"
          : status === "offline"
            ? "Offline"
            : status;

  const statusClass =
    status === "scanning"
      ? "bg-chart-2"
      : status === "idle"
        ? "bg-primary"
        : status === "stopped"
          ? "bg-destructive"
          : "bg-muted-foreground";

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trading mode</span>
        <div className="inline-flex overflow-hidden rounded-lg border border-border bg-muted/50 p-0.5">
          <button
            type="button"
            onClick={() => setMode("test")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              mode === "test" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Test
          </button>
          <button
            type="button"
            onClick={() => setMode("live")}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              mode === "live" ? "bg-destructive text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Live
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {mode === "live" ? "Real Zerodha executions" : "Paper only"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={cn("h-2 w-2 rounded-full", statusClass, status === "scanning" && "t-pulse")} />
          <span className="font-medium text-foreground">{statusLabel}</span>
        </div>
        <button type="button" onClick={toggleSystem} disabled={toggling} className={cn("t-btn", enabled ? "t-btn-red" : "t-btn-green")}>
          <Power className="mr-1 inline h-3.5 w-3.5" />
          {toggling ? "…" : enabled ? "Stop scanner" : "Start scanner"}
        </button>
        <button type="button" onClick={onFullscreenPnl} className="t-btn text-primary">
          <Maximize2 className="mr-1 inline h-3.5 w-3.5" />
          Full P&amp;L
          <span className="ml-1 hidden text-muted-foreground sm:inline">Ctrl+K</span>
        </button>
      </div>
    </div>
  );
}
