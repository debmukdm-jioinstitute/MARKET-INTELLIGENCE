import { buildSnapshot, METRICS, type MetricId, type MetricValues } from "../snapshot";
import { FAMILY_LABEL, type FamilyId } from "../stress/compute";
import { getState, setState } from "./store";
import type { NewEvent } from "./types";

const ist = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const f = (n: number, d = 2) => n.toLocaleString("en-IN", { maximumFractionDigits: d });

interface Prev {
  metrics: MetricValues;
  families: FamilyId[];
  band: string | null;
  date: string;
}

// where a visitor can see each metric
const HREF: Partial<Record<MetricId, string>> = {
  india_vix: "/markets/india/vix",
  us_vix: "/macro/global",
  nifty: "/markets/india/nifty50",
  nifty_1d_pct: "/markets/india/nifty50",
  usdinr: "/macro/currency",
  usdinr_1d_pct: "/macro/currency",
  brent: "/macro/commodities",
  brent_1d_pct: "/macro/commodities",
  us10y: "/macro/yields",
  gsec10y: "/macro/yields",
  dxy_1d_pct: "/macro/currency",
  fii_net: "/macro/india",
  dii_net: "/macro/india",
  rbi_net_liquidity: "/macro/rbi",
  stress_score: "/macro/stress",
  convergence_score: "/macro/stress",
};

/** Round levels whose crossing is worth a line. `step` = size of one bucket. */
const STEPS: { m: MetricId; step: number; severity: "medium" | "info"; unit: string }[] = [
  { m: "usdinr", step: 1, severity: "medium", unit: "₹" },
  { m: "brent", step: 5, severity: "info", unit: "$" },
  { m: "nifty", step: 500, severity: "info", unit: "" },
  { m: "us10y", step: 0.25, severity: "info", unit: "%" },
  { m: "gsec10y", step: 0.1, severity: "info", unit: "%" },
];

/** Thresholds for indicators where being above a level is the story (fear gauges). */
const VIX_LEVELS: { m: "india_vix" | "us_vix"; levels: [number, "medium" | "high"][] }[] = [
  { m: "india_vix", levels: [[20, "medium"], [25, "high"], [30, "high"]] },
  { m: "us_vix", levels: [[25, "medium"], [30, "high"], [40, "high"]] },
];

/** One-day moves: crossing into a bucket for the first time that day. */
const DAY_MOVES: { m: MetricId; buckets: [number, "medium" | "high"][]; what: string }[] = [
  { m: "nifty_1d_pct", buckets: [[1, "medium"], [2, "high"]], what: "NIFTY 50" },
  { m: "usdinr_1d_pct", buckets: [[0.5, "medium"], [1, "high"]], what: "USD/INR" },
  { m: "brent_1d_pct", buckets: [[3, "medium"], [5, "high"]], what: "Brent crude" },
  { m: "dxy_1d_pct", buckets: [[0.7, "medium"]], what: "the US dollar index" },
];

const FLOWS: { m: "fii_net" | "dii_net"; who: string }[] = [
  { m: "fii_net", who: "FIIs" },
  { m: "dii_net", who: "DIIs" },
];

export function diffMarket(prev: Prev, cur: { metrics: MetricValues; families: FamilyId[]; band: string | null }, date: string): NewEvent[] {
  const ev: NewEvent[] = [];
  const p = prev.metrics;
  const c = cur.metrics;
  const num = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

  for (const { m, levels } of VIX_LEVELS) {
    if (!num(p[m]) || !num(c[m])) continue;
    const desc = [...levels].sort((x, y) => y[0] - x[0]);
    const rose = desc.find(([lvl]) => p[m]! < lvl && c[m]! >= lvl); // highest level crossed upward
    if (rose) {
      ev.push({ key: `lvl:${m}:${rose[0]}:up:${date}`, category: "market", severity: rose[1], title: `${METRICS[m].label} rose above ${rose[0]}`, body: `Now ${f(c[m]!)} (was ${f(p[m]!)}). A higher fear gauge usually means larger swings ahead.`, href: HREF[m]! });
      continue;
    }
    const eased = desc.find(([lvl]) => lvl <= 25 && p[m]! >= lvl && c[m]! < lvl);
    if (eased) ev.push({ key: `lvl:${m}:${eased[0]}:down:${date}`, category: "market", severity: "info", title: `${METRICS[m].label} eased below ${eased[0]}`, body: `Now ${f(c[m]!)} (was ${f(p[m]!)}).`, href: HREF[m]! });
  }

  for (const { m, step, severity, unit } of STEPS) {
    if (!num(p[m]) || !num(c[m])) continue;
    const a = Math.floor(p[m]! / step);
    const b = Math.floor(c[m]! / step);
    if (a === b) continue;
    const up = b > a;
    const level = (up ? b : a) * step;
    const sfx = m === "us10y" || m === "gsec10y" ? "%" : "";
    const dp = step < 1 ? 2 : 0;
    ev.push({
      key: `step:${m}:${level.toFixed(3)}:${up ? "up" : "down"}:${date}`,
      category: m === "nifty" ? "market" : "macro",
      severity,
      title: `${METRICS[m].label} ${up ? "moved above" : "fell below"} ${unit}${f(level, dp)}${sfx}`,
      body: `Now ${unit}${f(c[m]!)}${sfx} (was ${unit}${f(p[m]!)}${sfx}).`,
      href: HREF[m]!,
    });
  }

  for (const { m, buckets, what } of DAY_MOVES) {
    if (!num(c[m])) continue;
    const before = Math.abs(p[m] ?? 0);
    const now = Math.abs(c[m]!);
    for (const [thr, sev] of [...buckets].sort((x, y) => y[0] - x[0])) {
      if (before < thr && now >= thr) {
        const dir = c[m]! > 0 ? "up" : "down";
        ev.push({ key: `day:${m}:${thr}:${dir}:${date}`, category: m === "nifty_1d_pct" ? "market" : "macro", severity: sev, title: `${what} is ${dir} ${f(now, 1)}% today`, body: `A move of more than ${thr}% in a single session.`, href: HREF[m]! });
        break; // announce only the largest bucket crossed
      }
    }
  }

  for (const { m, who } of FLOWS) {
    if (!num(c[m])) continue;
    const before = Math.abs(p[m] ?? 0);
    const now = Math.abs(c[m]!);
    for (const [thr, sev] of [[5000, "high"], [3000, "medium"]] as const) {
      if (before < thr && now >= thr) {
        const buy = c[m]! > 0;
        ev.push({ key: `flow:${m}:${thr}:${buy ? "buy" : "sell"}:${date}`, category: "market", severity: sev, title: `${who} ${buy ? "bought" : "sold"} ₹${f(now, 0)} cr net today`, body: `Provisional cash-market flow${buy ? " — strong buying" : " — heavy selling"} by ${who}.`, href: HREF[m]! });
        break; // announce only the largest threshold crossed
      }
    }
  }

  if (num(p.rbi_net_liquidity) && num(c.rbi_net_liquidity) && Math.sign(p.rbi_net_liquidity) !== Math.sign(c.rbi_net_liquidity) && Math.abs(c.rbi_net_liquidity) > 2000) {
    const inj = c.rbi_net_liquidity > 0;
    ev.push({ key: `rbiliq:${inj ? "inj" : "abs"}:${date}`, category: "macro", severity: "medium", title: `RBI turned a net ${inj ? "injector" : "absorber"} of liquidity`, body: `Net ${inj ? "injection" : "absorption"} of ₹${f(Math.abs(c.rbi_net_liquidity), 0)} cr (was ${f(p.rbi_net_liquidity, 0)}).`, href: HREF.rbi_net_liquidity! });
  }

  if (num(p.stress_score) && num(c.stress_score)) {
    const band = (s: number) => (s >= 80 ? 3 : s >= 60 ? 2 : s >= 40 ? 1 : 0);
    const names = ["calm", "moderate", "elevated", "extreme"];
    if (band(c.stress_score) !== band(p.stress_score)) {
      const up = band(c.stress_score) > band(p.stress_score);
      ev.push({ key: `stress:${band(c.stress_score)}:${up ? "up" : "down"}:${date}`, category: "macro", severity: up && band(c.stress_score) >= 2 ? "high" : "medium", title: `India Macro Stress Index ${up ? "rose" : "fell"} to ${names[band(c.stress_score)]}`, body: `Now ${f(c.stress_score, 0)}/100 (was ${f(p.stress_score, 0)}).`, href: HREF.stress_score! });
    }
  }
  for (const fam of cur.families) {
    if (!prev.families.includes(fam))
      ev.push({ key: `family:${fam}:${date}`, category: "macro", severity: "medium", title: `${FAMILY_LABEL[fam]} stress is now firing`, body: "One of the seven stress families crossed its alert level. Several firing together is a stronger warning.", href: "/macro/stress" });
  }
  return ev;
}

/** Compares the live market/macro snapshot with the previous check; first run only records a baseline. */
export async function detectMarket(): Promise<NewEvent[]> {
  const snap = await buildSnapshot();
  const cur = { metrics: snap.metrics, families: snap.stress.families.filter((x) => x.firing).map((x) => x.id), band: snap.stress.band };
  const prev = await getState<Prev>("market_prev");
  const date = ist();
  const ev = prev ? diffMarket(prev, cur, date) : [];
  await setState("market_prev", { ...cur, date });
  return ev;
}
