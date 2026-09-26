"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BackendState = { stub?: boolean; stub_note?: string; db_connected?: boolean; models_loaded?: boolean };

/** Backend connectivity: offline, stub, or full AI-trader Flask. */
export function AlgoBackendStatusBanner() {
  const [mode, setMode] = useState<"loading" | "offline" | "stub" | "full">("loading");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      fetch("/api/ai-trader/api/state", { cache: "no-store" })
        .then(async (r) => {
          if (cancelled) return;
          if (!r.ok) {
            setMode("offline");
            return;
          }
          const j = (await r.json()) as BackendState;
          if (j.stub) {
            setMode("stub");
            setNote(j.stub_note ?? null);
          } else if (j.db_connected && j.models_loaded) setMode("full");
          else setMode("stub");
        })
        .catch(() => {
          if (!cancelled) setMode("offline");
        });
    };
    check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (mode === "loading" || mode === "full") return null;

  if (mode === "stub") {
    return (
      <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Algo desk connected (limited backend)</p>
        <p className="mt-1">
          The portal reaches a health stub or partial stack. For full{" "}
          <a href="https://github.com/aaryansinha16/AI-trader" className="text-blue-600 underline" target="_blank" rel="noreferrer">
            AI-trader
          </a>{" "}
          features (TrueData ticks, TimescaleDB, XGBoost, live scanner), run{" "}
          <span className="text-foreground">services/ai-trader</span> with Python 3.13+ and point{" "}
          <span className="tabular-nums">AI_TRADER_API_URL</span> at it. See{" "}
          <Link href="/data/health" className="text-blue-600 underline">
            Data health
          </Link>{" "}
          and docs/AI-TRADER.md.
        </p>
        {note ? <p className="mt-2 text-xs">{note}</p> : null}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">Algo desk backend offline</p>
      <p className="mt-1">
        Set <span className="tabular-nums">AI_TRADER_API_URL</span> on Vercel to your Flask host, or run{" "}
        <span className="text-foreground">./scripts/ai-trader-tunnel.sh</span> after{" "}
        <span className="text-foreground">./scripts/start-ai-trader-backend.sh</span>, then{" "}
        <span className="text-foreground">./scripts/sync-ai-trader-vercel-env.sh</span>.
      </p>
      <p className="mt-2 text-xs">Research and education only — not investment advice.</p>
    </div>
  );
}
