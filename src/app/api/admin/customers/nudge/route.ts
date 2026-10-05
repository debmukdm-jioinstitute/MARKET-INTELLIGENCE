import { requireAdmin } from "@/lib/admin/guard";
import { sendTransactionalEmail } from "@/lib/admin/email";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { renderReengagementEmail, type ReengagementCustomer } from "@/lib/admin/reengagement-email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") ?? "").trim().toLowerCase();
  const customMarketUpdate = searchParams.get("customMarketUpdate") || undefined;
  const customSubject = searchParams.get("customSubject") || undefined;
  const featuresParam = searchParams.get("features");
  const includedFeatureKeys = featuresParam ? featuresParam.split(",").map((s) => s.trim()) : undefined;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  await ensureSchema();
  const db = sql();
  const [customer] = (await db`
    SELECT email, name, role, created_at, last_login_at
    FROM users
    WHERE lower(email) = ${email}
    LIMIT 1
  `) as (ReengagementCustomer & { role: string })[];

  if (!customer) {
    return NextResponse.json({ error: "No user found with that email." }, { status: 404 });
  }

  const preview = await renderReengagementEmail({
    customer,
    customMarketUpdate,
    includedFeatureKeys,
    customSubject,
  });

  return NextResponse.json({ ok: true, customer, preview });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    customMarketUpdate?: string;
    includedFeatureKeys?: string[];
    customSubject?: string;
    previewOnly?: boolean;
  };

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  await ensureSchema();
  const db = sql();
  const [customer] = (await db`
    SELECT email, name, role, created_at, last_login_at
    FROM users
    WHERE lower(email) = ${email}
    LIMIT 1
  `) as (ReengagementCustomer & { role: string })[];

  if (!customer) {
    return NextResponse.json({ error: "No customer account found with that email." }, { status: 404 });
  }

  const rendered = await renderReengagementEmail({
    customer,
    customMarketUpdate: body.customMarketUpdate,
    includedFeatureKeys: body.includedFeatureKeys,
    customSubject: body.customSubject,
  });

  if (body.previewOnly) {
    return NextResponse.json({ ok: true, preview: rendered, customer });
  }

  const sendResult = await sendTransactionalEmail({
    to: customer.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    kind: "marketing",
  });

  if (!sendResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: sendResult.error || "Failed to send re-engagement email.",
        provider: sendResult.provider,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    sentTo: customer.email,
    daysInactive: rendered.daysInactive,
    resendId: sendResult.id,
    provider: sendResult.provider,
    subject: rendered.subject,
  });
}
