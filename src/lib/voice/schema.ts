import { neon } from "@neondatabase/serverless";
import { normalizePhone, type CallCandidate } from "./eligibility";

/**
 * ONLY file coupled to your table/column names.
 * Assumed: users(id, first_name, phone, call_consent, last_active_at)
 *          subscriptions(user_id, plan, status, ends_at)   plan in daily|plus|pro
 * Adjust the SQL below if your names differ.
 */
const sql = () => neon(process.env.VOICE_DATABASE_URL!);

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
    SELECT id, first_name, call_consent, last_active_at FROM users
    WHERE regexp_replace(phone, '\D', '', 'g') LIKE ${"%" + phone.slice(3)} LIMIT 1`;
  if (!users.length) return null;
  const u = users[0];
  const subs = await db`
    SELECT plan, status, ends_at FROM subscriptions
    WHERE user_id = ${u.id} ORDER BY ends_at DESC NULLS LAST LIMIT 10`;
  const now = Date.now();
  const active = subs.find((s) => s.status === "active" && (!s.ends_at || new Date(s.ends_at).getTime() > now));
  return {
    userId: String(u.id),
    firstName: u.first_name ?? "",
    plan: (active?.plan ?? "free") as CustomerView["plan"],
    planHistory: subs.map((s) => ({ plan: s.plan, endedAt: s.ends_at ? new Date(s.ends_at).toISOString() : null })),
    lastActiveAt: u.last_active_at ? new Date(u.last_active_at).toISOString() : null,
    callConsent: !!u.call_consent,
  };
}

export async function listCandidates(): Promise<(CallCandidate & { userId: string; firstName: string })[]> {
  const db = sql();
  const rows = await db`
    SELECT u.id, u.first_name, u.phone, u.call_consent, u.last_active_at,
      EXISTS (SELECT 1 FROM voice_dnd d WHERE regexp_replace(d.phone,'\D','','g') LIKE '%' || right(regexp_replace(u.phone,'\D','','g'),10)) AS on_dnd,
      (SELECT plan FROM subscriptions s WHERE s.user_id=u.id AND s.status='active' AND (s.ends_at IS NULL OR s.ends_at>now()) LIMIT 1) AS active_plan,
      EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id=u.id) AS ever_paid,
      (SELECT max(ends_at) FROM subscriptions s WHERE s.user_id=u.id) AS last_paid_ended_at,
      (SELECT count(*) FROM voice_calls c WHERE c.user_id=u.id::text AND c.direction='outbound' AND c.created_at > date_trunc('day', now())) AS attempts_today,
      (SELECT count(*) FROM voice_calls c WHERE c.user_id=u.id::text AND c.direction='outbound' AND c.created_at > now() - interval '30 days') AS attempts_30d
    FROM users u WHERE u.call_consent = true AND u.phone IS NOT NULL`;
  return rows.map((r) => ({
    userId: String(r.id), firstName: r.first_name ?? "", phone: r.phone, callConsent: !!r.call_consent,
    onDnd: !!r.on_dnd, currentPlan: (r.active_plan ?? "free") as CallCandidate["currentPlan"],
    everPaid: !!r.ever_paid, lastPaidEndedAt: r.last_paid_ended_at ? new Date(r.last_paid_ended_at) : null,
    lastActiveAt: r.last_active_at ? new Date(r.last_active_at) : null,
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
