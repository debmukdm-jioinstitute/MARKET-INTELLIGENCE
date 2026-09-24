import { sendNewsletter, hasEmailConfigured } from "@/lib/admin/email";
import { hasPushConfigured, sendPush, type PushSubscriptionRow } from "@/lib/admin/push";
import { sql } from "@/lib/db";
import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";
import { METRICS, type MetricValues } from "@/lib/snapshot";
import { listActiveRules, type Op, type Rule } from "./store";

const test = (v: number, op: Op, t: number) => (op === ">" ? v > t : op === "<" ? v < t : op === ">=" ? v >= t : v <= t);

export function ruleMatches(rule: Pick<Rule, "conditions" | "combinator">, m: MetricValues): { hit: boolean; detail: string[] } {
  const results = rule.conditions.map((c) => {
    const v = m[c.metric];
    const label = METRICS[c.metric].label;
    return { ok: v != null && test(v, c.op, c.value), text: `${label} ${v == null ? "n/a" : Number(v.toFixed(2))} (${c.op} ${c.value})` };
  });
  const hit = rule.combinator === "all" ? results.every((r) => r.ok) : results.some((r) => r.ok);
  return { hit, detail: results.map((r) => r.text) };
}

const COOLDOWN_OK = (last: string | null, hours: number) => !last || Date.now() - new Date(last).getTime() >= hours * 3_600_000;

export type EvalReport = { rules: number; fired: number; pushSent: number; emailed: number; skipped: number };

/** Evaluates every active rule once (called by the 3-hourly cron). Cooldown is per rule; a fired rule stays quiet until it elapses. */
export async function evaluateRules(metrics: MetricValues, dry = false): Promise<EvalReport & { would?: string[] }> {
  const rules = await listActiveRules();
  const report: EvalReport & { would: string[] } = { rules: rules.length, fired: 0, pushSent: 0, emailed: 0, skipped: 0, would: [] };
  const db = sql();
  for (const rule of rules) {
    const { hit, detail } = ruleMatches(rule, metrics);
    if (!hit) continue;
    if (!COOLDOWN_OK(rule.lastFiredAt, rule.cooldownHours)) {
      report.skipped++;
      continue;
    }
    const message = `${rule.name}: ${detail.join("; ")}`;
    if (dry) {
      report.would.push(`${rule.userEmail} → ${message}`);
      continue;
    }
    let pushSent = 0;
    let emailSent = false;
    if (rule.channels.includes("push") && hasPushConfigured()) {
      const subs = (await db`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_email = ${rule.userEmail}`) as PushSubscriptionRow[];
      for (const sub of subs) {
        const r = await sendPush(sub, { title: `Alert: ${rule.name}`, body: detail.join(" · "), url: "/intelligence/alerts" });
        if (r.ok) pushSent++;
        else if (r.expired) await db`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
      }
    }
    if (rule.channels.includes("email") && hasEmailConfigured()) {
      const r = await sendNewsletter(`Alert: ${rule.name}`, [rule.userEmail], () =>
        `<div style="${GOOGLE_SANS_FONT_FAMILY_CSS};max-width:520px;padding:16px"><h3 style="margin:0 0 8px">${rule.name.replace(/</g, "&lt;")}</h3><p style="font-size:14px">${detail.map((d) => d.replace(/</g, "&lt;")).join("<br>")}</p><p style="font-size:12px;color:#5f6368">Your alert rule fired. Rules are checked every 3 hours. <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://getmarketintelligence.vercel.app"}/intelligence/alerts">Manage rules</a>. Not investment advice.</p></div>`,
      ).catch(() => ({ sent: 0 }));
      emailSent = r.sent > 0;
    }
    await db`INSERT INTO alert_events (rule_id, user_email, message, metric_values, push_sent, email_sent) VALUES (${rule.id}::uuid, ${rule.userEmail}, ${message}, ${JSON.stringify(metrics)}::jsonb, ${pushSent}, ${emailSent})`;
    await db`UPDATE alert_rules SET last_fired_at = now() WHERE id = ${rule.id}::uuid`;
    report.fired++;
    report.pushSent += pushSent;
    if (emailSent) report.emailed++;
  }
  return report;
}
