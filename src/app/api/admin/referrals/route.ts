import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

/** GET /api/admin/referrals?status=&q= → referral funnel + full referral list (admin only). */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ stats: null, referrals: [] });

  await ensureSchema();
  const db = sql();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // pending | converted
  const q = searchParams.get("q")?.trim().toLowerCase();

  const statsRows = (await db`
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE referral_code IS NOT NULL) AS codes_issued,
      COUNT(*)::int AS total_referred,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'converted')::int AS converted
    FROM referrals
  `) as { codes_issued: number; total_referred: number; pending: number; converted: number }[];
  const s = statsRows[0] ?? { codes_issued: 0, total_referred: 0, pending: 0, converted: 0 };

  const rows = (await db`
    SELECT r.referrer_email, r.referee_email, r.referral_code, r.status,
           r.created_at, r.converted_at,
           ru.name AS referrer_name, fu.name AS referee_name
    FROM referrals r
    LEFT JOIN users ru ON ru.email = r.referrer_email
    LEFT JOIN users fu ON fu.email = r.referee_email
    WHERE (${status}::text IS NULL OR r.status = ${status}::text)
      AND (${q}::text IS NULL
           OR r.referrer_email ILIKE '%' || ${q}::text || '%'
           OR r.referee_email ILIKE '%' || ${q}::text || '%')
    ORDER BY r.created_at DESC
    LIMIT 500
  `) as {
    referrer_email: string;
    referee_email: string;
    referral_code: string;
    status: string;
    created_at: Date | string;
    converted_at: Date | string | null;
    referrer_name: string | null;
    referee_name: string | null;
  }[];

  const iso = (d: Date | string | null) => (d == null ? null : d instanceof Date ? d.toISOString() : d);
  return NextResponse.json({
    stats: {
      codesIssued: s.codes_issued,
      totalReferred: s.total_referred,
      pending: s.pending,
      converted: s.converted,
      conversionRate: s.total_referred > 0 ? Number(((s.converted / s.total_referred) * 100).toFixed(1)) : 0,
    },
    referrals: rows.map((r) => ({
      referrer_email: r.referrer_email,
      referrer_name: r.referrer_name,
      referee_email: r.referee_email,
      referee_name: r.referee_name,
      referral_code: r.referral_code,
      status: r.status,
      created_at: iso(r.created_at),
      converted_at: iso(r.converted_at),
    })),
  });
}
