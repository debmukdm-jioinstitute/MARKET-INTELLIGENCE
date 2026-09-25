"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Shown when the Flask algo backend is not reachable through the portal proxy. */
export function AlgoBackendStatusBanner() {
  const [offline, setOffline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      fetch("/api/ai-trader/api/state", { cache: "no-store" })
        .then((r) => {
          if (!cancelled) setOffline(!r.ok);
        })
        .catch(() => {
          if (!cancelled) setOffline(true);
        });
    };
    check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (offline !== true) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">Algo desk backend offline</p>
      <p className="mt-1">
        Live trading, backtests, and charts need the{" "}
        <a
          href="https://github.com/aaryansinha16/AI-trader"
          className="text-blue-600 underline"
          target="_blank"
          rel="noreferrer"
        >
          AI-trader
        </a>{" "}
        Flask API (TimescaleDB + TrueData). Run it locally or on a VPS, then set{" "}
        <span className="tabular-nums">AI_TRADER_API_URL</span> on this deployment. See{" "}
        <Link href="/data/health" className="text-blue-600 underline">
          Data health
        </Link>{" "}
        and <code className="text-xs">docs/AI-TRADER.md</code> in the repo.
      </p>
      <p className="mt-2 text-xs">Research and education only — not investment advice. Live mode can route orders via broker APIs; use TEST mode first.</p>
    </div>
  );
}
