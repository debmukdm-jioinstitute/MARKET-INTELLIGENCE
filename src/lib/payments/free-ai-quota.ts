import type { SessionUser } from "@/lib/auth";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getProEntitlement, isProUser } from "@/lib/payments/pro-entitlement";
import { NextResponse } from "next/server";

/** Shared pool: AI Desk + Options Flow runs per calendar month (IST). */
export const FREE_AI_ANALYSES_PER_MONTH = 5;

export type FreeAiQuotaView = {
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
  periodLabel: string;
};

const memUsage = new Map<string, number>();

export function freeAiPeriodKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(now);
}

function periodLabel(periodKey: string): string {
  const [y, m] = periodKey.split("-").map(Number);
  if (!y || !m) return periodKey;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

function memKey(email: string, periodKey: string): string {
  return `${email.toLowerCase()}|${periodKey}`;
}

export async function getFreeAiQuotaView(email: string): Promise<Omit<FreeAiQuotaView, "unlimited">> {
  const periodKey = freeAiPeriodKey();
  const limit = FREE_AI_ANALYSES_PER_MONTH;
  let used = 0;

  if (hasDatabase()) {
    try {
      await ensureSchema();
      const rows = (await sql()`
        SELECT used_count FROM free_ai_monthly_usage
        WHERE user_email = ${email.toLowerCase()} AND period_ym = ${periodKey}
        LIMIT 1
      `) as { used_count: number }[];
      used = rows[0]?.used_count ?? 0;
    } catch {
      used = memUsage.get(memKey(email, periodKey)) ?? 0;
    }
  } else {
    used = memUsage.get(memKey(email, periodKey)) ?? 0;
  }

  const capped = Math.min(Math.max(used, 0), limit);
  return {
    limit,
    used: capped,
    remaining: Math.max(0, limit - capped),
    periodLabel: periodLabel(periodKey),
  };
}

export async function getFreeAiQuotaForUser(user: SessionUser | null): Promise<FreeAiQuotaView | null> {
  if (!user || user.guest) return null;
  const pro = await getProEntitlement(user.email);
  if (isProUser(user, pro)) {
    return {
      unlimited: true,
      limit: FREE_AI_ANALYSES_PER_MONTH,
      used: 0,
      remaining: FREE_AI_ANALYSES_PER_MONTH,
      periodLabel: periodLabel(freeAiPeriodKey()),
    };
  }
  const view = await getFreeAiQuotaView(user.email);
  return { unlimited: false, ...view };
}

/** Block before run when free tier exhausted. Pro/admin skip. */
export async function checkFreeAiQuota(user: SessionUser | null): Promise<NextResponse | null> {
  if (!user) {
    return NextResponse.json({ error: "Sign in to run AI analyses" }, { status: 401 });
  }
  if (user.guest) {
    return NextResponse.json(
      { error: "Create a free account to use AI Desk and Options Flow analyses", code: "ACCOUNT_REQUIRED" },
      { status: 403 },
    );
  }
  const pro = await getProEntitlement(user.email);
  if (isProUser(user, pro)) return null;

  const view = await getFreeAiQuotaView(user.email);
  if (view.remaining <= 0) {
    return NextResponse.json(
      {
        error: `Free limit reached — ${FREE_AI_ANALYSES_PER_MONTH} AI Desk and Options Flow analyses per month. Upgrade for unlimited runs.`,
        code: "FREE_QUOTA_EXCEEDED",
        upgradeUrl: "/pricing",
        quota: view,
      },
      { status: 402 },
    );
  }
  return null;
}

/** Call once after a successful analysis run (non-pro only). */
export async function recordFreeAiAnalysisUse(user: SessionUser | null): Promise<void> {
  if (!user || user.guest) return;
  const pro = await getProEntitlement(user.email);
  if (isProUser(user, pro)) return;

  const email = user.email.toLowerCase();
  const periodKey = freeAiPeriodKey();
  const limit = FREE_AI_ANALYSES_PER_MONTH;

  if (hasDatabase()) {
    try {
      await ensureSchema();
      await sql()`
        INSERT INTO free_ai_monthly_usage (user_email, period_ym, used_count)
        VALUES (${email}, ${periodKey}, 1)
        ON CONFLICT (user_email, period_ym) DO UPDATE
        SET used_count = LEAST(${limit}, free_ai_monthly_usage.used_count + 1)
      `;
      return;
    } catch {
      /* mem fallback */
    }
  }

  const key = memKey(email, periodKey);
  const next = Math.min(limit, (memUsage.get(key) ?? 0) + 1);
  memUsage.set(key, next);
}
