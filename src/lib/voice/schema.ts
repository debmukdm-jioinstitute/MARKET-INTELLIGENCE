import { neon } from "@neondatabase/serverless";
import { normalizePhone, type CallCandidate } from "./eligibility";

/**
 * ONLY file coupled to your table/column names.
 * Real tables (src/lib/db.ts ensureSchema, plus voice.sql):
 *   users(email PRIMARY KEY, name, phone, call_consent, last_login_at,
 *         pro_plan, pro_expires_at)
 *     phone + call_consent are added by docs/voice-agent/voice.sql;
 *     ensureSchema does not create them.
 *   razorpay_orders(user_email, plan_id, status, paid_at)
 *     plan_id in day_pass|pro_monthly|pro_annual; status 'paid' = paid order.
 *   voice_calls(user_id, ...), voice_dnd(phone),
 *     voice_payment_links(user_id, plan, link_url)
 *     voice_* .user_id stores the user's email: users has no numeric id.
 * Voice plan names (eligibility) map from real plan ids:
 *   day_pass -> daily, pro_monthly -> plus, pro_annual -> pro.
 * A user is on a plan when pro_plan is set and pro_expires_at is null or in
 * the future (the same null-means-active rule the old subscriptions query
 * used). When the plan has expired, pro_expires_at is the last paid end date,
 * which is what winback timing (eligibility.segmentOf) needs.
 * razorpay_orders has no per-order expiry, so planHistory endedAt is null;
 * do not invent one. The current expiry, when known, is pro_expires_at.
 */
const sql = () => neon(process.env.VOICE_DATABASE_URL!);

type VoicePlan = CallCandidate["currentPlan"];

function firstNameOf(name: string | null): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

function toVoicePlan(planId: string | null | undefined): VoicePlan {
  switch (planId) {
    case "day_pass":
    case "daily":
      return "daily";
    case "pro_monthly":
    case "plus":
      return "plus";
    case "pro_annual":
    case "pro":
      return "pro";
    default:
      return "free";
  }
}

function activeVoicePlan(
  proPlan: string | null,
  proExpiresAt: Date | string | null,
): VoicePlan {
  if (!proPlan) return "free";
  if (proExpiresAt && new Date(proExpiresAt).getTime() <= Date.now()) {
    return "free";
  }
  return toVoicePlan(proPlan);
}

export interface CustomerView {
  userId: string;
  firstName: string;
  plan: CallCandidate["currentPlan"];
  planHistory: { plan: string; endedAt: string | null }[];
  lastActiveAt: string | null;
  callConsent: boolean;
}

export async function getCustomerByPhone(rawPhone: string): Promise<CustomerView | null> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return null;
  const db = sql();
  const users = await db`
    SELECT email, name, call_consent, last_login_at, pro_plan, pro_expires_at FROM users
    WHERE regexp_replace(phone, '\D', '', 'g') LIKE ${"%" + phone.slice(3)} LIMIT 1`;
  if (!users.length) return null;
  const u = users[0];
  const orders = await db`
    SELECT plan_id, paid_at FROM razorpay_orders
    WHERE user_email = ${u.email} AND status = 'paid'
    ORDER BY paid_at DESC NULLS LAST LIMIT 10`;
  return {
    userId: String(u.email),
    firstName: firstNameOf(u.name),
    plan: activeVoicePlan(u.pro_plan, u.pro_expires_at),
    planHistory: orders.map((o) => ({ plan: toVoicePlan(o.plan_id), endedAt: null })),
    lastActiveAt: u.last_login_at ? new Date(u.last_login_at).toISOString() : null,
    callConsent: !!u.call_consent,
  };
}

export async function listCandidates(): Promise<(CallCandidate & { userId: string; firstName: string })[]> {
  const db = sql();
  const rows = await db`
    SELECT u.email, u.name, u.phone, u.call_consent, u.last_login_at,
      u.pro_plan, u.pro_expires_at,
      EXISTS (SELECT 1 FROM voice_dnd d WHERE regexp_replace(d.phone,'\D','','g') LIKE '%' || right(regexp_replace(u.phone,'\D','','g'),10)) AS on_dnd,
      EXISTS (SELECT 1 FROM razorpay_orders o WHERE o.user_email=u.email AND o.status='paid') AS ever_paid,
      (SELECT count(*) FROM voice_calls c WHERE c.user_id=u.email AND c.direction='outbound' AND c.created_at > date_trunc('day', now())) AS attempts_today,
      (SELECT count(*) FROM voice_calls c WHERE c.user_id=u.email AND c.direction='outbound' AND c.created_at > now() - interval '30 days') AS attempts_30d
    FROM users u WHERE u.call_consent = true AND u.phone IS NOT NULL AND u.phone <> ''`;
  return rows.map((r) => ({
    userId: String(r.email), firstName: firstNameOf(r.name), phone: r.phone, callConsent: !!r.call_consent,
    onDnd: !!r.on_dnd, currentPlan: activeVoicePlan(r.pro_plan, r.pro_expires_at),
    everPaid: !!r.ever_paid, lastPaidEndedAt: r.pro_expires_at ? new Date(r.pro_expires_at) : null,
    lastActiveAt: r.last_login_at ? new Date(r.last_login_at) : null,
    attemptsToday: Number(r.attempts_today), attempts30d: Number(r.attempts_30d),
  }));
}

export async function logCall(e: { userId: string; phone: string; segment: string; direction?: string; result?: string; churnReason?: string; callId?: string }) {
  await sql()`INSERT INTO voice_calls (user_id, phone, segment, direction, result, churn_reason, samvaad_call_id)
    VALUES (${e.userId}, ${e.phone}, ${e.segment}, ${e.direction ?? "outbound"}, ${e.result ?? null}, ${e.churnReason ?? null}, ${e.callId ?? null})`;
}

export async function addDnd(phone: string) {
  await sql()`INSERT INTO voice_dnd (phone) VALUES (${phone}) ON CONFLICT DO NOTHING`;
}

export async function recentPaymentLink(userId: string, plan: string): Promise<string | null> {
  const r = await sql()`SELECT link_url FROM voice_payment_links WHERE user_id=${userId} AND plan=${plan}
    AND created_at > now() - interval '10 minutes' ORDER BY created_at DESC LIMIT 1`;
  return r[0]?.link_url ?? null;
}

export async function saveLink(userId: string, plan: string, url: string) {
  await sql()`INSERT INTO voice_payment_links (user_id, plan, link_url) VALUES (${userId}, ${plan}, ${url})`;
}
