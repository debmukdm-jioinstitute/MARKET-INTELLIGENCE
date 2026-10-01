"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useAiAnalysisQuota } from "@/hooks/use-ai-analysis-quota";
import { FREE_AI_ANALYSES_PER_MONTH } from "@/lib/payments/free-ai-quota";
import Link from "next/link";

export function FreeTierAiQuotaBanner({ context }: { context: "ai-desk" | "options-flow" }) {
  const { user } = useAuth();
  const { signedIn, isPro, quota, blocked, isLoading } = useAiAnalysisQuota();

  if (!user || user.guest) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>{" "}
        for {FREE_AI_ANALYSES_PER_MONTH} free AI Desk + Options Flow analyses per month (shared counter).{" "}
        <Link href="/pricing" className="font-semibold text-primary hover:underline">
          Upgrade
        </Link>{" "}
        for unlimited runs.
      </div>
    );
  }

  if (isLoading || isPro || !signedIn || !quota || quota.unlimited) return null;

  const label = context === "options-flow" ? "Options Flow" : "AI Desk";

  return (
    <div
      className={
        blocked
          ? "rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          : "rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
      }
    >
      <p>
        <span className="font-semibold text-foreground">{label} free tier:</span>{" "}
        <span className="tabular-nums">
          {quota.used} / {quota.limit}
        </span>{" "}
        analyses used in {quota.periodLabel}
        {quota.remaining > 0 ? (
          <>
            {" "}
            — <span className="font-medium text-foreground">{quota.remaining} left</span>
          </>
        ) : (
          <> — limit reached</>
        )}
        . Paid plans get unlimited AI Desk and Options Flow runs.{" "}
        <Link href="/pricing" className="font-semibold text-primary hover:underline">
          Upgrade
        </Link>
      </p>
    </div>
  );
}
