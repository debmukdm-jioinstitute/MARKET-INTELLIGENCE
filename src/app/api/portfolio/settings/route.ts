import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { getSessionEmail } from "@/lib/session";
import { DEFAULT_PORTFOLIO_SETTINGS } from "@/lib/my-portfolio/defaults";
import type { PortfolioSettings } from "@/lib/my-portfolio/types";
import { updateSettingsSchema } from "@/lib/validations/portfolio";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json(DEFAULT_PORTFOLIO_SETTINGS);
  }
  try {
    await ensureSchema();
    const email = await getSessionEmail();
    const db = sql();
    const rows = await db`SELECT name, benchmark, base_currency FROM portfolio_settings WHERE user_email = ${email}`;
    const row = rows[0];
    const settings: PortfolioSettings = {
      name: (row?.name as string) ?? DEFAULT_PORTFOLIO_SETTINGS.name,
      benchmark: (row?.benchmark as PortfolioSettings["benchmark"]) ?? DEFAULT_PORTFOLIO_SETTINGS.benchmark,
      baseCurrency: "INR",
    };
    return NextResponse.json(settings);
  } catch (e) {
    console.warn("DB query failed in settings GET, using default:", e);
    return NextResponse.json(DEFAULT_PORTFOLIO_SETTINGS);
  }
}

export async function PUT(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = updateSettingsSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: errorDetails, issues: parseResult.error.issues }, { status: 400 });
  }

  const body = parseResult.data;
  const name = body.name || DEFAULT_PORTFOLIO_SETTINGS.name;
  const benchmark = body.benchmark ?? DEFAULT_PORTFOLIO_SETTINGS.benchmark;

  if (!hasDatabase()) {
    return NextResponse.json({ ok: true, note: "Updated in local mode" });
  }

  try {
    await ensureSchema();
    const email = await getSessionEmail();
    const db = sql();
    await db`
      INSERT INTO portfolio_settings (user_email, name, benchmark)
      VALUES (${email}, ${name}, ${benchmark})
      ON CONFLICT (user_email) DO UPDATE SET name = ${name}, benchmark = ${benchmark}, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to update settings" }, { status: 502 });
  }
}
