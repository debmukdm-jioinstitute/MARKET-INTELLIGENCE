"use client";

import { useState } from "react";
import { useHeartbeatState, useXpSummary } from "@/lib/gamification/client";
import { cn } from "@/lib/utils";
import { Flame, Gift, Loader2, Sparkles, Timer, Trophy } from "lucide-react";

export const XP_REWARD_COST = 300;

interface RedeemSuccess {
  balance: number;
  pro_expires_at: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export function XpJourneyCard() {
  const { data, loading } = useXpSummary();
  const { state: beat, loading: beatLoading } = useHeartbeatState();

  const [redeemState, setRedeemState] = useState<{ status: "idle" | "busy" | "done" | "error"; message?: string }>({ status: "idle" });
  const [redeemed, setRedeemed] = useState<RedeemSuccess | null>(null);

  const redeem = async () => {
    setRedeemState({ status: "busy" });
    try {
      const res = await fetch("/api/gamification/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reward: "plus_monthly" }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        needed?: number;
        balance?: number;
        pro_expires_at?: string | null;
      };
      if (res.status === 402) {
        const needed = typeof json.needed === "number" ? json.needed : Math.max(0, XP_REWARD_COST - (data?.total ?? 0));
        setRedeemState({
          status: "error",
          message: `You need ${needed.toLocaleString("en-IN")} more XP to unlock 1 month of Plus free. Keep using the terminal — every day counts.`,
        });
        return;
      }
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : `Request failed (${res.status})`);
      setRedeemed({ balance: typeof json.balance === "number" ? json.balance : 0, pro_expires_at: json.pro_expires_at ?? null });
      setRedeemState({ status: "done" });
    } catch (e) {
      setRedeemState({ status: "error", message: e instanceof Error ? e.message : "Could not redeem right now. Please try again." });
    }
  };

  const balance = redeemed?.balance ?? data?.total ?? 0;
  const pct = Math.min(100, Math.max(0, (balance / XP_REWARD_COST) * 100));
  const needed = Math.max(0, XP_REWARD_COST - balance);
  const busy = redeemState.status === "busy";

  return (
    <section id="xp-journey" aria-label="Your XP journey" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your XP journey</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {XP_REWARD_COST} XP = <span className="font-semibold text-foreground">1 month of Plus free</span>. Earn it with daily use — no card, no payment.
          </p>
        </div>
        {data ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
            <Sparkles className="size-3.5" aria-hidden />
            {data.level}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 space-y-3" aria-label="Loading your XP journey">
          <div className="h-10 w-44 animate-pulse rounded-lg bg-muted" />
          <div className="h-2.5 w-full animate-pulse rounded-full bg-muted" />
        </div>
      ) : !data ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Sign in to start earning XP toward a free Plus month — every visit, search and research session counts.
        </p>
      ) : (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="text-4xl font-bold tracking-tight text-foreground">
              {balance.toLocaleString("en-IN")}
              <span className="ml-1 text-lg font-medium text-muted-foreground">XP</span>
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Timer className="size-4" aria-hidden />
                {beatLoading ? "…" : `${beat?.minutesToday ?? 0} min today`}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Flame className="size-4 text-orange-500" aria-hidden />
                {beatLoading ? "…" : `${beat?.streak ?? 0}-day streak`}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{Math.round(pct)}% of the way to a free month of Plus</span>
              <span className="font-medium">
                {needed > 0 ? `${needed.toLocaleString("en-IN")} XP to go` : "Redeemable now"}
              </span>
            </div>
            <div
              className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress to 300 XP for a free month of Plus"
            >
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {redeemState.status === "done" && redeemed ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <Trophy className="size-5 text-emerald-700" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Plus unlocked — congratulations.</p>
                <p className="mt-0.5 text-sm text-emerald-800">
                  {redeemed.pro_expires_at ? `Your Plus access runs until ${fmtDate(redeemed.pro_expires_at)}.` : "Your Plus access is now active."}{" "}
                  Balance: {redeemed.balance.toLocaleString("en-IN")} XP.
                </p>
              </div>
            </div>
          ) : null}

          {redeemState.status === "error" && redeemState.message ? (
            <p role="alert" className="mt-4 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
              {redeemState.message}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={redeem}
              disabled={busy || needed > 0 || redeemState.status === "done"}
              className={cn(
                "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold transition disabled:opacity-50",
                needed > 0 ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Gift className="size-4" aria-hidden />}
              {busy ? "Redeeming…" : needed > 0 ? `Redeem · ${needed.toLocaleString("en-IN")} XP away` : "Redeem 300 XP for 1 month Plus"}
            </button>
            <p className="text-xs text-muted-foreground">
              Use the terminal 5–10 minutes a day for 30 days and you&apos;ll have enough XP for a free month.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
