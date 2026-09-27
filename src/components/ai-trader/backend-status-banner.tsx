"use client";

import { SignInRequiredBanner } from "@/components/auth/sign-in-required-banner";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import { useEffect, useState } from "react";

type BackendState = {
  stub?: boolean;
  stub_note?: string;
  demo_mode?: boolean;
  demo_note?: string;
  db_connected?: boolean;
  models_loaded?: boolean;
};

/** Backend connectivity: guest, offline, health stub, partial stack, or full desk. */
export function AlgoBackendStatusBanner({ nextPath = "/algo" }: { nextPath?: string }) {
  const { ready, isGuest } = useAuth();
  const [mode, setMode] = useState<"loading" | "auth" | "offline" | "stub" | "demo" | "partial" | "full">("loading");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (isGuest) {
      setMode("auth");
      return;
    }
    let cancelled = false;
    const check = () => {
      fetch("/api/ai-trader/api/state", { cache: "no-store" })
        .then(async (r) => {
          if (cancelled) return;
          if (r.status === 401) {
            setMode("auth");
            return;
          }
          if (!r.ok) {
            setMode("offline");
            return;
          }
          const j = (await r.json()) as BackendState;
          if (j.stub) {
            setMode("stub");
            setNote(j.stub_note ?? null);
          } else if (j.demo_mode) {
            setMode("demo");
            setNote(j.demo_note ?? null);
          } else if (j.db_connected && j.models_loaded) {
            setMode("full");
          } else if (j.db_connected) {
            setMode("partial");
            setNote(null);
          } else {
            setMode("partial");
            setNote("Database not connected on API host.");
          }
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
  }, [ready, isGuest]);

  if (mode === "loading" || mode === "full") return null;

  if (mode === "demo") {
    return (
      <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Demo algo desk (free tier)</p>
        <p className="mt-1">
          Sample backtests and live-style status — no Tiger DB or TrueData required. Charts use fixture data; paper/live trading stays off.
        </p>
        {note ? <p className="mt-2 text-xs">{note}</p> : null}
      </div>
    );
  }

  if (mode === "auth") {
    return (
      <div className="mb-4">
        <SignInRequiredBanner feature="NIFTY Algo Desk (Flask proxy)" nextPath={nextPath} />
      </div>
    );
  }

  if (mode === "stub") {
    return (
      <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Health stub only</p>
        <p className="mt-1">
          <span className="tabular-nums">AI_TRADER_API_URL</span> points at <code className="text-foreground">scripts/health_stub.py</code>, not full Flask. Deploy{" "}
          <span className="text-foreground">services/ai-trader</span> per{" "}
          <Link href="https://github.com/debmukdm-jioinstitute/MARKET-INTELLIGENCE/blob/main/docs/AI-TRADER-PRODUCTION.md" className="text-blue-600 underline">
            AI-TRADER-PRODUCTION
          </Link>
          .
        </p>
        {note ? <p className="mt-2 text-xs">{note}</p> : null}
      </div>
    );
  }

  if (mode === "partial") {
    return (
      <div className="mb-4 rounded-lg border border-amber-500/35 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Flask API up — desk not fully armed</p>
        <p className="mt-1">
          Proxy OK. Missing trained <span className="text-foreground">models/saved/*.pkl</span>, tick history, and/or{" "}
          <span className="text-foreground">backtest_results/</span> on the API host. Use checklist below, then{" "}
          <Link href="/algo/backtest" className="text-blue-600 underline">
            tick backtest
          </Link>
          .
        </p>
        {note ? <p className="mt-2 text-xs">{note}</p> : null}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
      <p className="font-semibold text-foreground">Algo desk backend offline</p>
      <p className="mt-1">
        Set <span className="tabular-nums">AI_TRADER_API_URL</span> on Vercel, or run local Flask + tunnel scripts. Signed-in users only — data loads when backend responds.
      </p>
    </div>
  );
}
