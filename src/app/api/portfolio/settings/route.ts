import { ensureSchema, sql } from "@/lib/db";
import { getSessionEmail } from "@/lib/session";
import type { PortfolioSettings } from "@/lib/my-portfolio/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSchema();
    const email = await getSessionEmail();
    const db = sql();
    const rows = await db`SELECT name, benchmark, base_currency FROM portfolio_settings WHERE user_email = ${email}`;
    const row = rows[0];
    const settings: PortfolioSettings = {
      name: (row?.name as string) ?? "My Portfolio",
      benchmark: (row?.benchmark as PortfolioSettings["benchmark"]) ?? "NIFTY50",
      baseCurrency: "INR",
    };
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load settings" }, { status: 502 });
  }
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Partial<PortfolioSettings>;
  const name = body.name?.trim() || "My Portfolio";
  const benchmark = body.benchmark ?? "NIFTY50";
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
