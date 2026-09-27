"use client";

import { fetchJSON, type BacktestResults, type LiveState } from "@/lib/ai-trader/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type DayRow = { day: string; ticks: number };

type Readiness = {
  loading: boolean;
  error: string | null;
  db: boolean;
  models: boolean;
  tickDays: number;
  backtestProfiles: number;
  lastPrice: number | null;
  status: string | null;
};

function Step({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex gap-2 text-sm">
      <span className={cn("mt-0.5 size-2 shrink-0 rounded-full", ok ? "bg-chart-2" : "bg-amber-500")} aria-hidden />
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}

/** Why /algo looks empty: backend checklist (DB, ticks, models, backtest files). */
export function AlgoDeskSetupCard() {
  const [r, setR] = useState<Readiness>({
    loading: true,
    error: null,
    db: false,
    models: false,
    tickDays: 0,
    backtestProfiles: 0,
    lastPrice: null,
    status: null,
  });

  const load = useCallback(async () => {
    setR((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [state, days, results] = await Promise.all([
        fetchJSON<LiveState>("/api/state").catch(() => null),
        fetchJSON<DayRow[]>("/api/days").catch(() => []),
        fetchJSON<BacktestResults>("/api/backtest/results").catch(() => null),
      ]);
      const profiles = results
        ? (["low", "medium", "high"] as const).filter((k) => {
            const row = results[k];
            return row != null && Number(row.trades) > 0;
          }).length
        : 0;
      setR({
        loading: false,
        error: state ? null : "Could not reach algo API (sign in, or check AI_TRADER_API_URL).",
        db: Boolean(state?.db_connected),
        models: Boolean(state?.models_loaded),
        tickDays: Array.isArray(days) ? days.length : 0,
        backtestProfiles: profiles,
        lastPrice: state?.last_price ?? null,
        status: state?.status ?? null,
      });
    } catch (e) {
      setR((prev) => ({
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : "Desk status check failed",
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ready = r.db && r.models && r.tickDays > 0 && r.backtestProfiles > 0;
  if (!r.loading && ready) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/5 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground">Algo desk setup incomplete</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Portal proxy works; Flask needs tick data, trained models, and a backtest run before dashboards fill in.
          </p>
        </div>
        <button type="button" onClick={() => load()} className="t-btn inline-flex items-center gap-1 text-sm">
          <RefreshCw className={cn("size-3.5", r.loading && "animate-spin")} />
          Recheck
        </button>
      </div>
      {r.error ? <p className="mt-2 text-sm text-rose-600">{r.error}</p> : null}
      <ul className="mt-3 space-y-2">
        <Step
          ok={r.db}
          label="TimescaleDB (Tiger)"
          detail={r.db ? "Connected from API host." : "Fix DB_* secrets on Fly/VPS — see docs/AI-TRADER-PRODUCTION.md."}
        />
        <Step
          ok={r.tickDays > 0}
          label="Tick / minute history"
          detail={
            r.tickDays > 0
              ? `${r.tickDays} day(s) in DB — live NIFTY last: ${r.lastPrice ? `₹${r.lastPrice}` : "—"}.`
              : "Set TRUEDATA_* and run ingestion (market hours) so /api/days is non-empty."
          }
        />
        <Step
          ok={r.models}
          label="ML models (macro + micro + strategy)"
          detail={
            r.models
              ? "Loaded on API host."
              : "Copy models/saved/*.pkl to server (restore_from_backup.py) or run python main.py train on the host."
          }
        />
        <Step
          ok={r.backtestProfiles > 0}
          label="Backtest results"
          detail={
            r.backtestProfiles > 0
              ? `${r.backtestProfiles} risk profile(s) with trades.`
              : "Open Tick backtest and run low/medium/high once ticks exist."
          }
        />
      </ul>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link href="/algo/backtest" className="font-semibold text-primary hover:underline">
          Run tick backtest →
        </Link>
        <Link href="/algo/live" className="text-muted-foreground hover:text-foreground">
          Live desk
        </Link>
        <a
          href="https://github.com/debmukdm-jioinstitute/MARKET-INTELLIGENCE/blob/main/docs/AI-TRADER-PRODUCTION.md"
          className="text-muted-foreground hover:text-foreground"
          target="_blank"
          rel="noreferrer"
        >
          Production guide
        </a>
      </div>
      {r.status ? <p className="mt-2 text-xs text-muted-foreground">API status: {r.status}</p> : null}
    </div>
  );
}
