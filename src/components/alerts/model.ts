/** Shared types, plain-English sentence builders, and rule templates for the Alerts revamp. */

export type Cond = { metric: string; op: string; value: number };

export type Rule = {
  id: string;
  name: string;
  conditions: Cond[];
  combinator: "all" | "any";
  channels: string[];
  cooldownHours: number;
  active: boolean;
  lastFiredAt: string | null;
};

export type MetricInfo = { id: string; label: string; unit: string; current?: number | null };

export type Draft = {
  name: string;
  conditions: Cond[];
  combinator: "all" | "any";
  channels: string[];
  cooldownHours: number;
};

export const OPS = [">", "<", ">=", "<="] as const;

export const OP_WORD: Record<string, string> = {
  ">": "crosses above",
  "<": "falls below",
  ">=": "is at least",
  "<=": "is at most",
};

export const MAX_CONDITIONS = 5;
export const MIN_COOLDOWN = 1;
export const MAX_COOLDOWN = 168;

export function fmtNum(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** "India VIX crosses above 20 pts" */
export function condSentence(c: Cond, labelOf: (id: string) => MetricInfo | undefined): string {
  const m = labelOf(c.metric);
  const label = m?.label ?? c.metric;
  const unit = m?.unit ? ` ${m.unit}` : "";
  return `${label} ${OP_WORD[c.op] ?? c.op} ${fmtNum(c.value)}${unit}`;
}

/** Plain-words condition list, no "Tell me when" prefix — for rule cards. */
export function condListText(conditions: Cond[], combinator: "all" | "any", labelOf: (id: string) => MetricInfo | undefined): string {
  const parts = conditions.map((c) => condSentence(c, labelOf));
  if (parts.length <= 1) return parts[0] ?? "";
  return combinator === "all" ? `all of: ${parts.join(" · ")}` : `any of: ${parts.join(" · ")}`;
}

/** Full plain-English preview shown in the rule studio. */
export function draftSentence(d: Draft, labelOf: (id: string) => MetricInfo | undefined): string {
  const body = condListText(d.conditions, d.combinator, labelOf);
  return `Tell me when ${body}.`;
}

/** Evaluate one condition against the metric's current value. */
export function evalCond(c: Cond, current: number | null | undefined): boolean | null {
  if (current == null || !Number.isFinite(current)) return null;
  switch (c.op) {
    case ">": return current > c.value;
    case "<": return current < c.value;
    case ">=": return current >= c.value;
    case "<=": return current <= c.value;
    default: return null;
  }
}

/** Would the whole draft fire right now, given current values? */
export function draftWouldFire(d: Draft, labelOf: (id: string) => MetricInfo | undefined): boolean | null {
  const results = d.conditions.map((c) => evalCond(c, labelOf(c.metric)?.current));
  if (results.some((r) => r === null)) return null;
  const bools = results as boolean[];
  return d.combinator === "all" ? bools.every(Boolean) : bools.some(Boolean);
}

export type Template = {
  id: string;
  title: string;
  blurb: string;
  draft: Draft;
};

/** One-tap starting points. Metric ids must match the /api/alerts catalog. */
export const TEMPLATES: Template[] = [
  {
    id: "vix-spike",
    title: "VIX spike",
    blurb: "Ping me when market fear jumps",
    draft: { name: "VIX spike", conditions: [{ metric: "india_vix", op: ">", value: 20 }], combinator: "all", channels: ["push"], cooldownHours: 12 },
  },
  {
    id: "fii-selling",
    title: "FII selling",
    blurb: "Foreign investors pulling money out",
    draft: { name: "FII selling", conditions: [{ metric: "fii_net", op: "<", value: -2000 }], combinator: "all", channels: ["push"], cooldownHours: 12 },
  },
  {
    id: "stress-rising",
    title: "Stress rising",
    blurb: "Macro stress index heating up",
    draft: { name: "Market stress rising", conditions: [{ metric: "stress_score", op: ">", value: 60 }], combinator: "all", channels: ["push"], cooldownHours: 12 },
  },
  {
    id: "crude-shock",
    title: "Crude shock",
    blurb: "A sharp one-day jump in oil",
    draft: { name: "Crude oil shock", conditions: [{ metric: "brent_1d_pct", op: ">", value: 3 }], combinator: "all", channels: ["push"], cooldownHours: 24 },
  },
  {
    id: "rupee-slide",
    title: "Rupee sliding",
    blurb: "USD/INR crossing a round number",
    draft: { name: "Rupee sliding", conditions: [{ metric: "usdinr", op: ">", value: 90 }], combinator: "all", channels: ["push"], cooldownHours: 24 },
  },
  {
    id: "nifty-jump",
    title: "Big NIFTY day",
    blurb: "A strong up day on the index",
    draft: { name: "Big NIFTY day", conditions: [{ metric: "nifty_1d_pct", op: ">", value: 1.5 }], combinator: "all", channels: ["push"], cooldownHours: 12 },
  },
];

export const DEFAULT_DRAFT: Draft = {
  name: "",
  conditions: [{ metric: "india_vix", op: ">", value: 20 }],
  combinator: "all",
  channels: ["push"],
  cooldownHours: 12,
};
