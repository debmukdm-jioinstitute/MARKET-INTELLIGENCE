"use client";

import { SignInRequiredBanner } from "@/components/auth/sign-in-required-banner";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import { useEffect, useState } from "react";

type BackendState = { stub?: boolean; stub_note?: string; db_connected?: boolean; models_loaded?: boolean };

/** Backend connectivity: guest, offline, stub, or full AI-trader Flask. */
export function AlgoBackendStatusBanner({ nextPath = "/algo" }: { nextPath?: string }) {
  const { ready, isGuest } = useAuth();
  const [mode, setMode] = useState<"loading" | "auth" | "offline" | "stub" | "full">("loading");
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
  }, [ready, isGuest]);

  if (mode === "loading" || mode === "full") return null;

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
        <p className="font-semibold text-foreground">Algo desk connected (limited backend)</p>
        <p className="mt-1">
          Portal reaches health stub or partial stack. Full{" "}
          <a href="https://github.com/aaryansinha16/AI-trader" className="text-blue-600 underline" target="_blank" rel="noreferrer">
            AI-trader
          </a>{" "}
          needs <span className="text-foreground">services/ai-trader</span> + <span className="tabular-nums">AI_TRADER_API_URL</span>. See{" "}
          <Link href="/data/health" className="text-blue-600 underline">
            Data health
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
