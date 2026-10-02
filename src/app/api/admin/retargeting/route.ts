import { hasEmailConfigured, isSandboxSender, sendTransactionalEmail } from "@/lib/admin/email";
import { requireAdmin } from "@/lib/admin/guard";
import { defaultSiteUrl } from "@/lib/onboarding/load-form-model";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { isValidEmail } from "@/lib/newsletter";
import { loadRetargetingAudience } from "@/lib/retargeting/load-audience";
import { renderRetargetingEmail } from "@/lib/retargeting/render-email";
import { RETARGETING_TEMPLATES, getRetargetingTemplate } from "@/lib/retargeting/templates";
import type { RetargetingSegment } from "@/lib/retargeting/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function segmentStats(customers: Awaited<ReturnType<typeof loadRetargetingAudience>>) {
  const bySegment: Record<string, number> = {};
  let active = 0;
  let lapsed = 0;
  for (const c of customers) {
    bySegment[c.segment] = (bySegment[c.segment] ?? 0) + 1;
    if (c.entitlementActive) active += 1;
    else lapsed += 1;
  }
  return { total: customers.length, active, lapsed, bySegment };
}

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;

  const url = new URL(req.url);
  const previewEmail = url.searchParams.get("preview")?.trim().toLowerCase() ?? "";
  const templateId = url.searchParams.get("templateId")?.trim() ?? "";

  const customers = await loadRetargetingAudience();
  const payload: Record<string, unknown> = {
    customers,
    templates: RETARGETING_TEMPLATES,
    stats: segmentStats(customers),
    emailConfigured: hasEmailConfigured(),
    sandboxMode: isSandboxSender(),
    recentSends: [],
  };

  if (hasDatabase()) {
    await ensureSchema();
    payload.recentSends = await sql()`
      SELECT template_id, recipient_email, subject, sent_at, sent_by
      FROM retargeting_sends
      ORDER BY sent_at DESC
      LIMIT 30
    `;
  }

  if (previewEmail && templateId) {
    const template = getRetargetingTemplate(templateId);
    const customer = customers.find((c) => c.email === previewEmail);
    if (!template || !customer) {
      return NextResponse.json({ ...payload, previewError: "Invalid preview email or template." });
    }
    const siteUrl = defaultSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
    const preview = renderRetargetingEmail(customer, template, siteUrl);
    payload.preview = { email: previewEmail, ...preview };
  }

  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });
  if (!hasEmailConfigured()) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    templateId?: unknown;
    segment?: unknown;
    emails?: unknown;
  };
  const templateId = String(body.templateId ?? "").trim();
  const template = getRetargetingTemplate(templateId);
  if (!template) return NextResponse.json({ error: "Unknown templateId" }, { status: 400 });

  const segmentFilter = body.segment ? (String(body.segment) as RetargetingSegment) : null;
  const rawEmails = body.emails;
  const explicit: string[] = Array.isArray(rawEmails)
    ? [
        ...new Set(
          rawEmails
            .map((e: unknown) => String(e).trim().toLowerCase())
            .filter((e): e is string => isValidEmail(e)),
        ),
      ]
    : [];

  const customers = await loadRetargetingAudience();
  let targets = customers;
  if (explicit.length > 0) {
    const set = new Set(explicit);
    targets = customers.filter((c) => set.has(c.email));
  } else if (segmentFilter) {
    targets = customers.filter((c) => c.segment === segmentFilter);
  } else {
    targets = customers.filter((c) => template.segments.includes(c.segment));
  }

  if (targets.length === 0) {
    return NextResponse.json({ error: "No matching paid customers for this send." }, { status: 400 });
  }

  const siteUrl = defaultSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const founderReply = "Deb@getmarketintelligence.in";
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  await ensureSchema();
  const db = sql();

  for (const customer of targets) {
    const rendered = renderRetargetingEmail(customer, template, siteUrl);
    const out = await sendTransactionalEmail({
      to: customer.email,
      subject: rendered.subject,
      html: rendered.html,
      replyTo: founderReply,
    });
    if (out.ok) {
      sent += 1;
      await db`
        INSERT INTO retargeting_sends (template_id, recipient_email, subject, sent_by, resend_id)
        VALUES (${templateId}, ${customer.email}, ${rendered.subject}, ${guard.user.email}, ${out.id ?? null})
      `;
    } else {
      failed += 1;
      errors.push(`${customer.email}: ${out.error ?? "send failed"}`);
    }
  }

  return NextResponse.json({
    ok: true,
    templateId,
    targeted: targets.length,
    sent,
    failed,
    errors,
  });
}
