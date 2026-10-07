import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const SITE_URL = "https://getmarketintelligence.in";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

async function requireUser() {
  const user = await getSessionUser();
  return user && !user.guest ? user : null;
}

/** Issues a unique MI-XXXXXX code to the caller if they don't have one yet. */
async function ensureReferralCode(email: string): Promise<string> {
  const db = sql();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let suffix = "";
    for (let i = 0; i < 6; i += 1) suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
    const code = `MI-${suffix}`;
    const taken = await db`SELECT 1 AS one FROM users WHERE referral_code = ${code} LIMIT 1`;
    if (taken.length > 0) continue;
    await db`UPDATE users SET referral_code = ${code} WHERE email = ${email} AND referral_code IS NULL`;
    const rows = (await db`SELECT referral_code FROM users WHERE email = ${email}`) as {
      referral_code: string | null;
    }[];
    if (rows[0]?.referral_code) return rows[0].referral_code;
  }
  throw new Error("Could not generate a unique referral code");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "***";
  return `${local[0]}***@${domain}`;
}

function iso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return new Date(value).toISOString();
  return null;
}

/**
 * GET /api/referrals/me
 * Returns the caller's referral code + share link, conversion stats, and the
 * list of people they referred (emails masked).
 */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your referrals" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  await ensureSchema();
  const db = sql();

  const me = (await db`SELECT referral_code FROM users WHERE email = ${user.email}`) as {
    referral_code: string | null;
  }[];
  if (me.length === 0) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const code = me[0].referral_code ?? (await ensureReferralCode(user.email));

  const statRows = (await db`
    SELECT status, COUNT(*)::int AS count FROM referrals
    WHERE referrer_email = ${user.email}
    GROUP BY status
  `) as { status: string; count: number }[];
  let pending = 0;
  let converted = 0;
  for (const r of statRows) {
    if (r.status === "converted") converted = r.count;
    else pending += r.count;
  }

  const rows = (await db`
    SELECT referee_email, status, created_at, converted_at FROM referrals
    WHERE referrer_email = ${user.email}
    ORDER BY created_at DESC
    LIMIT 100
  `) as {
    referee_email: string;
    status: string;
    created_at: unknown;
    converted_at: unknown;
  }[];

  return NextResponse.json({
    code,
    link: `${SITE_URL}/signup?ref=${encodeURIComponent(code)}`,
    stats: { pending, converted },
    referrals: rows.map((r) => ({
      referee_email: maskEmail(r.referee_email),
      status: r.status,
      created_at: iso(r.created_at),
      converted_at: iso(r.converted_at),
    })),
  });
}
