import { SCANNERS } from "../scanner/scanners";
import type { ScanRun, SignalsRun } from "../scanner/types";
import type { NewEvent } from "./types";

const list = (rows: { symbol: string }[], n = 5) => rows.slice(0, n).map((r) => r.symbol).join(", ") + (rows.length > n ? ` +${rows.length - n} more` : "");

/**
 * What a new daily scan changes for a visitor. Only announces once per session date and (for lists) only stocks that
 * are NEW versus the previous scan, so a persistent condition is not repeated every day.
 */
const SCAN_RULES: { id: string; min: number; severity: "medium" | "info"; text: (n: number) => string; newOnly?: boolean }[] = [
  { id: "high52w", min: 5, severity: "medium", text: (n) => `${n} Nifty 500 stocks closed at a 52-week high` },
  { id: "low52w", min: 3, severity: "medium", text: (n) => `${n} Nifty 500 stocks closed at a 52-week low` },
  { id: "dip-uptrend", min: 1, severity: "medium", text: (n) => `${n} oversold dip${n === 1 ? "" : "s"} in an uptrend flagged — the scanner setup that held up in testing` },
  { id: "golden-cross", min: 1, severity: "info", text: (n) => `${n} new golden cross${n === 1 ? "" : "es"} (50-day over 200-day)`, newOnly: true },
  { id: "death-cross", min: 1, severity: "info", text: (n) => `${n} new death cross${n === 1 ? "" : "es"} (50-day under 200-day)`, newOnly: true },
  { id: "vcp", min: 1, severity: "info", text: (n) => `${n} new volatility-contraction (VCP) setup${n === 1 ? "" : "s"}`, newOnly: true },
  { id: "double-bottom", min: 1, severity: "info", text: (n) => `${n} double-bottom breakout${n === 1 ? "" : "s"}`, newOnly: true },
];

export function diffScan(prev: ScanRun | null, cur: ScanRun): NewEvent[] {
  if (prev && prev.lastBar === cur.lastBar) return []; // same session — nothing new
  const ev: NewEvent[] = [];
  for (const r of SCAN_RULES) {
    const rows = cur.scanners[r.id] ?? [];
    const before = new Set((prev?.scanners[r.id] ?? []).map((x) => x.symbol));
    const shown = r.newOnly ? rows.filter((x) => !before.has(x.symbol)) : rows;
    if (shown.length < r.min) continue;
    const def = SCANNERS.find((s) => s.id === r.id);
    ev.push({
      key: `scan:${r.id}:${cur.lastBar}`,
      category: "scanner",
      severity: r.severity,
      title: r.text(shown.length),
      body: `${list(shown)} · ${def?.label ?? r.id}, session ${cur.lastBar}.`,
      href: "/intelligence/scanner",
    });
  }
  return ev;
}

export function diffSignals(prev: SignalsRun | null, cur: SignalsRun): NewEvent[] {
  const ev: NewEvent[] = [];
  const a = prev?.nifty.call1;
  const b = cur.nifty.call1;
  if (prev && prev.lastBar !== cur.lastBar && a !== b && b !== "Neutral" && cur.nifty.pUp1 != null) {
    ev.push({
      key: `ai:nifty-lean:${cur.lastBar}:${b}`,
      category: "ai",
      severity: "medium",
      title: `Nifty model lean turned ${b.toLowerCase()} for the next session`,
      body: `P(up) ${(cur.nifty.pUp1 * 100).toFixed(0)}% (was ${a}). Check the model's track record before relying on it — it has not beaten the always-up baseline.`,
      href: "/intelligence/ai-signals",
    });
  }
  if (prev && prev.lastBar !== cur.lastBar) {
    const before = new Set(prev.stocks.btst.map((x) => x.symbol));
    const fresh = cur.stocks.btst.filter((x) => !before.has(x.symbol) && x.pUp >= 0.8);
    if (fresh.length >= 3)
      ev.push({ key: `ai:btst:${cur.lastBar}`, category: "ai", severity: "info", title: `${fresh.length} new high-conviction BTST candidates`, body: `${list(fresh)} (model P(up) ≥ 80%).`, href: "/intelligence/ai-signals" });
  }
  return ev;
}
