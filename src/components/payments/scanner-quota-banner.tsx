"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useScannerQuota } from "@/hooks/use-scanner-quota";
import {
  FREE_SCANNER_SCANS_PER_MONTH,
  SCANNER_SCANS_BY_PLAN,
} from "@/lib/payments/scanner-quota";
import Link from "next/link";

export function ScannerQuotaBanner() {
  const { user } = useAuth();
  const { signedIn, quota, blocked, isLoading } = useScannerQuota();

  if (!user || user.guest) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Link href="/login?next=/intelligence/scanner" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>{" "}
        for {FREE_SCANNER_SCANS_PER_MONTH} free Stock Scanner runs per month (each scan type counts once; reopening the
        same scan is free).{" "}
        <Link href="/pricing" className="font-semibold text-primary hover:underline">
          See plans
        </Link>
      </div>
    );
  }

  if (isLoading || !signedIn || !quota || quota.unlimited) return null;

  return (
    <div
      className={
        blocked
          ? "rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
          : "rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
      }
    >
      <p>
        <span className="font-semibold text-foreground">Stock Scanner ({quota.tierLabel}):</span>{" "}
        <span className="tabular-nums">
          {quota.used} / {quota.limit}
        </span>{" "}
        scan types used in {quota.periodLabel}
        {quota.remaining > 0 ? (
          <>
            {" "}
            — <span className="font-medium text-foreground">{quota.remaining} left</span>
          </>
        ) : (
          <> — limit reached</>
        )}
        .
      </p>
      {blocked ? (
        <p className="mt-2 text-sm">
          Upgrade for more scans this month: Daily pass{" "}
          <span className="tabular-nums font-medium">{SCANNER_SCANS_BY_PLAN.day_pass}</span>, Plus{" "}
          <span className="tabular-nums font-medium">{SCANNER_SCANS_BY_PLAN.pro_monthly}</span>, Pro{" "}
          <span className="tabular-nums font-medium">{SCANNER_SCANS_BY_PLAN.pro_annual}</span>.{" "}
          <Link href="/pricing" className="font-semibold text-primary hover:underline">
            View pricing
          </Link>
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Paid caps: Daily pass {SCANNER_SCANS_BY_PLAN.day_pass} · Plus {SCANNER_SCANS_BY_PLAN.pro_monthly} · Pro{" "}
          {SCANNER_SCANS_BY_PLAN.pro_annual} scan types / month.
        </p>
      )}
    </div>
  );
}

export function ScannerQuotaUpgradePanel() {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm">
      <p className="font-semibold text-foreground">You have used all Stock Scanner runs for this month.</p>
      <p className="mt-2 text-muted-foreground">
        Each scan type (breakouts, RSI, volume, etc.) counts once per month. Reopening a scan you already opened stays
        free.
      </p>
      <ul className="mt-3 space-y-1 tabular-nums">
        <li>
          <span className="font-medium">Free</span> — {FREE_SCANNER_SCANS_PER_MONTH} scan types / month
        </li>
        <li>
          <span className="font-medium">Daily pass</span> — {SCANNER_SCANS_BY_PLAN.day_pass} scan types / month
        </li>
        <li>
          <span className="font-medium">Plus</span> — {SCANNER_SCANS_BY_PLAN.pro_monthly} scan types / month
        </li>
        <li>
          <span className="font-medium">Pro</span> — {SCANNER_SCANS_BY_PLAN.pro_annual} scan types / month
        </li>
      </ul>
      <Link
        href="/pricing"
        className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Upgrade on pricing
      </Link>
    </div>
  );
}
