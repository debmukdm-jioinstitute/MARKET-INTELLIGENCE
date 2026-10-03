import type { SessionUser } from "@/lib/auth";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getProEntitlement, isProEntitlementActive } from "@/lib/payments/pro-entitlement";
import type { RazorpayPlanId } from "@/lib/payments/plans";
import { freeAiPeriodKey } from "@/lib/payments/free-ai-quota";
import { NextResponse } from "next/server";

export const FREE_SCANNER_SCANS_PER_MONTH = 5;

export const SCANNER_SCANS_BY_PLAN: Record<RazorpayPlanId, number> = {
  day_pass: 10,
  pro_monthly: 30,
  pro_annual: 60,
};

export type ScannerQuotaView = {
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
  periodLabel: string;
  tierLabel: string;
};

const memOpens = new Set<string>();

function periodLabel(periodKey: string): string {
  const [y, m] = periodKey.split("-").map(Number);
  if (!y || !m) return periodKey;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

function memOpenKey(email: string, periodKey: string, scannerId: string): string {
  return `${email.toLowerCase()}|${periodKey}|${scannerId}`;
}

export function scannerMonthlyLimit(user: SessionUser, planId: RazorpayPlanId | null, entitlementActive: boolean): number {
  if (user.role === "admin") return Number.MAX_SAFE_INTEGER;
  if (!entitlementActive || !planId) return FREE_SCANNER_SCANS_PER_MONTH;
  return SCANNER_SCANS_BY_PLAN[planId] ?? FREE_SCANNER_SCANS_PER_MONTH;
}

export function scannerTierLabel(user: SessionUser, planId: RazorpayPlanId | null, entitlementActive: boolean): string {
  if (user.role === "admin") return "Admin";
  if (!entitlementActive || !planId) return "Free";
  if (planId === "day_pass") return "Daily pass";
  if (planId === "pro_monthly") return "Plus";
  return "Pro";
}

async function countDistinctOpens(email: string, periodKey: string): Promise<number> {
  if (hasDatabase()) {
    try {
      await ensureSchema();
      const rows = (await sql()`
        SELECT count(*)::int AS n FROM scanner_monthly_opens
        WHERE user_email = ${email.toLowerCase()} AND period_ym = ${periodKey}
      `) as { n: number }[];
      return rows[0]?.n ?? 0;
    } catch {
      /* mem */
    }
  }
  const prefix = `${email.toLowerCase()}|${periodKey}|`;
  let n = 0;
  for (const k of memOpens) if (k.startsWith(prefix)) n += 1;
  return n;
}

async function hasOpen(email: string, periodKey: string, scannerId: string): Promise<boolean> {
  if (hasDatabase()) {
    try {
      await ensureSchema();
      const rows = (await sql()`
        SELECT 1 FROM scanner_monthly_opens
        WHERE user_email = ${email.toLowerCase()} AND period_ym = ${periodKey} AND scanner_id = ${scannerId}
        LIMIT 1
      `) as { "?column?": number }[];
      return rows.length > 0;
    } catch {
      /* mem */
    }
  }
  return memOpens.has(memOpenKey(email, periodKey, scannerId));
}

async function recordOpen(email: string, periodKey: string, scannerId: string): Promise<void> {
  if (hasDatabase()) {
    try {
      await ensureSchema();
      await sql()`
        INSERT INTO scanner_monthly_opens (user_email, period_ym, scanner_id)
        VALUES (${email.toLowerCase()}, ${periodKey}, ${scannerId})
        ON CONFLICT (user_email, period_ym, scanner_id) DO NOTHING
      `;
      return;
    } catch {
      /* mem */
    }
  }
  memOpens.add(memOpenKey(email, periodKey, scannerId));
}

export async function getScannerQuotaForUser(user: SessionUser | null): Promise<ScannerQuotaView | null> {
  if (!user || user.guest) return null;
  const pro = await getProEntitlement(user.email);
  const active = isProEntitlementActive(pro.expiresAt);
  const limit = scannerMonthlyLimit(user, pro.planId, active);
  const periodKey = freeAiPeriodKey();
  const used = await countDistinctOpens(user.email, periodKey);
  const cappedUsed = Math.min(Math.max(used, 0), limit);
  const unlimited = user.role === "admin";

  return {
    unlimited,
    limit: unlimited ? FREE_SCANNER_SCANS_PER_MONTH : limit,
    used: cappedUsed,
    remaining: unlimited ? FREE_SCANNER_SCANS_PER_MONTH : Math.max(0, limit - cappedUsed),
    periodLabel: periodLabel(periodKey),
    tierLabel: scannerTierLabel(user, pro.planId, active),
  };
}

/** Gate loading a scanner's match list. Re-opens same scanner in same month are free. */
export async function checkAndRecordScannerView(
  user: SessionUser,
  scannerId: string,
): Promise<{ ok: true; quota: ScannerQuotaView } | { ok: false; response: NextResponse }> {
  const pro = await getProEntitlement(user.email);
  const active = isProEntitlementActive(pro.expiresAt);
  const limit = scannerMonthlyLimit(user, pro.planId, active);
  const periodKey = freeAiPeriodKey();
  const quota = await getScannerQuotaForUser(user);
  if (!quota) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign in required", authRequired: true }, { status: 401 }),
    };
  }

  if (quota.unlimited) {
    await recordOpen(user.email, periodKey, scannerId);
    return { ok: true, quota: { ...quota, used: await countDistinctOpens(user.email, periodKey) } };
  }

  const already = await hasOpen(user.email, periodKey, scannerId);
  if (already) {
    return { ok: true, quota };
  }

  const used = await countDistinctOpens(user.email, periodKey);
  if (used >= limit) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Scanner limit reached — ${limit} distinct scans per month on ${quota.tierLabel}. Upgrade for more.`,
          code: "SCANNER_QUOTA_EXCEEDED",
          upgradeUrl: "/pricing",
          quota: { ...quota, used, remaining: 0 },
          planCaps: {
            free: FREE_SCANNER_SCANS_PER_MONTH,
            day_pass: SCANNER_SCANS_BY_PLAN.day_pass,
            pro_monthly: SCANNER_SCANS_BY_PLAN.pro_monthly,
            pro_annual: SCANNER_SCANS_BY_PLAN.pro_annual,
          },
        },
        { status: 402 },
      ),
    };
  }

  await recordOpen(user.email, periodKey, scannerId);
  const usedAfter = used + 1;
  return {
    ok: true,
    quota: {
      ...quota,
      used: usedAfter,
      remaining: Math.max(0, limit - usedAfter),
    },
  };
}
