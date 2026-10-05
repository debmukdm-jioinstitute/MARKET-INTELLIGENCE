import { hasEmailConfigured, isSandboxSender, listUnsubscribeHeaders, sendTransactionalEmail } from "@/lib/admin/email";
import { requireAdmin } from "@/lib/admin/guard";
import { defaultSiteUrl } from "@/lib/onboarding/load-form-model";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { isValidEmail } from "@/lib/newsletter";
import { GRANTABLE_PLAN_IDS, renderGrantEmail } from "@/lib/retargeting/grant-templates";
import { loadRegisteredMembers } from "@/lib/retargeting/load-registered-members";
import { grantProSubscription } from "@/lib/payments/pro-entitlement";
import type { RazorpayPlanId } from "@/lib/payments/plans";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parsePlanId(raw: unknown): RazorpayPlanId | null {
  const id = String(raw ?? "").trim();
  return GRANTABLE_PLAN_IDS.includes(id as RazorpayPlanId) ? (id as RazorpayPlanId) : null;
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    planId?: unknown;
    emails?: unknown;
    notify?: unknown;
    personalNote?: unknown;
  };

  const planId = parsePlanId(body.planId);
  if (!planId) return NextResponse.json({ error: "planId must be day_pass, pro_monthly, or pro_annual" }, { status: 400 });

  const rawEmails = body.emails;
  const emails: string[] = Array.isArray(rawEmails)
    ? [...new Set(rawEmails.map((e) => String(e).trim().toLowerCase()).filter(isValidEmail))]
    : [];
  if (emails.length === 0) return NextResponse.json({ error: "Select at least one member email." }, { status: 400 });

  const notify = body.notify !== false;
  if (notify && !hasEmailConfigured()) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured — cannot send grant email." }, { status: 503 });
  }

  const personalNote = String(body.personalNote ?? "").trim().slice(0, 500);
  const members = await loadRegisteredMembers();
  const byEmail = new Map(members.map((m) => [m.email, m]));
  const siteUrl = defaultSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const founderReply = "Deb@getmarketintelligence.in";

  let granted = 0;
  let emailed = 0;
  let failed = 0;
  const errors: string[] = [];

  await ensureSchema();
  const db = sql();

  for (const email of emails) {
    const member = byEmail.get(email);
    if (!member) {
      failed += 1;
      errors.push(`${email}: not a registered user`);
      continue;
    }
    if (member.role === "admin") {
      failed += 1;
      errors.push(`${email}: admin accounts are already full access`);
      continue;
    }

    try {
      const entitlement = await grantProSubscription(email, planId);
      granted += 1;

      if (notify && entitlement.expiresAt) {
        const rendered = renderGrantEmail(member, {
          firstName: member.name?.split(/\s+/)[0] ?? email.split("@")[0] ?? "there",
          grantedPlanId: planId,
          expiresAtIso: entitlement.expiresAt,
          siteUrl,
          personalNote,
        });
        const out = await sendTransactionalEmail({
          to: email,
          subject: rendered.subject,
          html: rendered.html,
          replyTo: founderReply,
          headers: listUnsubscribeHeaders(),
          kind: "marketing",
        });
        if (out.ok) {
          emailed += 1;
          await db`
            INSERT INTO retargeting_sends (template_id, recipient_email, subject, sent_by, resend_id)
            VALUES (${`grant_${planId}`}, ${email}, ${rendered.subject}, ${guard.user.email}, ${out.id ?? null})
          `;
        } else {
          errors.push(`${email}: granted but email failed — ${out.error ?? "unknown"}`);
        }
      }
    } catch (e) {
      failed += 1;
      errors.push(`${email}: ${e instanceof Error ? e.message : "grant failed"}`);
    }
  }

  return NextResponse.json({
    ok: true,
    planId,
    granted,
    emailed,
    failed,
    errors,
    sandboxMode: isSandboxSender(),
  });
}
