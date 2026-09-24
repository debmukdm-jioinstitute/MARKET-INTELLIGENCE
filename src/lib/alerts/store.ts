import { z } from "zod";
import { hasDatabase, sql } from "@/lib/db";
import { METRICS, type MetricId } from "@/lib/snapshot";

export const OPS = [">", "<", ">=", "<="] as const;
export type Op = (typeof OPS)[number];

const metricIds = Object.keys(METRICS) as [MetricId, ...MetricId[]];

export const RuleInput = z.object({
  name: z.string().trim().min(1).max(80),
  conditions: z
    .array(z.object({ metric: z.enum(metricIds), op: z.enum(OPS), value: z.number().finite().min(-1e9).max(1e9) }))
    .min(1)
    .max(5),
  combinator: z.enum(["all", "any"]).default("all"),
  channels: z.array(z.enum(["push", "email"])).min(1).default(["push"]),
  cooldownHours: z.number().int().min(1).max(168).default(12),
});
export type RuleInputT = z.infer<typeof RuleInput>;

export type Rule = RuleInputT & { id: string; active: boolean; lastFiredAt: string | null; createdAt: string };

export const MAX_RULES_PER_USER = 20;

let ready: Promise<void> | null = null;

export function ensureAlertSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS alert_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_email text NOT NULL,
        name text NOT NULL,
        conditions jsonb NOT NULL,
        combinator text NOT NULL DEFAULT 'all',
        channels text[] NOT NULL DEFAULT '{push}',
        cooldown_hours int NOT NULL DEFAULT 12,
        active boolean NOT NULL DEFAULT true,
        last_fired_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_alert_rules_user ON alert_rules(user_email)`;
    await db`
      CREATE TABLE IF NOT EXISTS alert_events (
        id bigserial PRIMARY KEY,
        rule_id uuid NOT NULL,
        user_email text NOT NULL,
        fired_at timestamptz NOT NULL DEFAULT now(),
        message text NOT NULL,
        metric_values jsonb NOT NULL,
        push_sent int NOT NULL DEFAULT 0,
        email_sent boolean NOT NULL DEFAULT false
      )
    `;
    await db`CREATE INDEX IF NOT EXISTS idx_alert_events_user ON alert_events(user_email, fired_at DESC)`;
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

type RuleRow = { id: string; user_email: string; name: string; conditions: RuleInputT["conditions"]; combinator: "all" | "any"; channels: ("push" | "email")[]; cooldown_hours: number; active: boolean; last_fired_at: Date | string | null; created_at: Date | string };

const toRule = (r: RuleRow): Rule & { userEmail: string } => ({
  id: r.id,
  userEmail: r.user_email,
  name: r.name,
  conditions: r.conditions,
  combinator: r.combinator,
  channels: r.channels,
  cooldownHours: r.cooldown_hours,
  active: r.active,
  lastFiredAt: r.last_fired_at ? new Date(r.last_fired_at).toISOString() : null,
  createdAt: new Date(r.created_at).toISOString(),
});

export async function listRules(email: string): Promise<Rule[]> {
  await ensureAlertSchema();
  return ((await sql()`SELECT * FROM alert_rules WHERE user_email = ${email} ORDER BY created_at DESC`) as RuleRow[]).map(toRule);
}

export async function listActiveRules(): Promise<(Rule & { userEmail: string })[]> {
  await ensureAlertSchema();
  return ((await sql()`SELECT * FROM alert_rules WHERE active`) as RuleRow[]).map(toRule);
}

export async function createRule(email: string, input: RuleInputT): Promise<Rule> {
  await ensureAlertSchema();
  const db = sql();
  const [{ n }] = (await db`SELECT count(*)::int AS n FROM alert_rules WHERE user_email = ${email}`) as { n: number }[];
  if (n >= MAX_RULES_PER_USER) throw new Error(`Rule limit reached (${MAX_RULES_PER_USER})`);
  const [row] = (await db`
    INSERT INTO alert_rules (user_email, name, conditions, combinator, channels, cooldown_hours)
    VALUES (${email}, ${input.name}, ${JSON.stringify(input.conditions)}::jsonb, ${input.combinator}, ${input.channels}::text[], ${input.cooldownHours})
    RETURNING *
  `) as RuleRow[];
  return toRule(row);
}

export async function deleteRule(email: string, id: string): Promise<void> {
  await ensureAlertSchema();
  await sql()`DELETE FROM alert_rules WHERE id = ${id}::uuid AND user_email = ${email}`;
}

export async function setRuleActive(email: string, id: string, active: boolean): Promise<void> {
  await ensureAlertSchema();
  await sql()`UPDATE alert_rules SET active = ${active} WHERE id = ${id}::uuid AND user_email = ${email}`;
}

export async function recentEvents(email: string, limit = 20) {
  await ensureAlertSchema();
  return (await sql()`SELECT id, rule_id, fired_at, message FROM alert_events WHERE user_email = ${email} ORDER BY fired_at DESC LIMIT ${limit}`) as { id: number; rule_id: string; fired_at: string; message: string }[];
}
