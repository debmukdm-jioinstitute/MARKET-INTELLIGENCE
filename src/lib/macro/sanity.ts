import type { IndiaMacroHubPayload, MacroMetric, MacroSectionId } from "@/lib/macro/types";
import { sectionMetrics } from "@/lib/macro/metric-tree";

/** Public macro section pages we sanity-check in cron + ops. */
export const MACRO_HUB_SECTION_PATHS: { id: MacroSectionId; path: string }[] = [
  { id: "employment", path: "/macro/employment" },
  { id: "global", path: "/macro/global" },
  { id: "rates-liquidity", path: "/macro/rates-liquidity" },
  { id: "consumer", path: "/macro/consumer" },
  { id: "corporate", path: "/macro/corporate" },
  { id: "fiscal", path: "/macro/fiscal" },
  { id: "external", path: "/macro/external" },
  { id: "growth", path: "/macro/growth" },
];

function parseObsDate(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}$/.test(s)) return Date.parse(`${s}-07-01T00:00:00.000Z`);
  if (/^\d{4}-\d{2}$/.test(s)) return Date.parse(`${s}-15T00:00:00.000Z`);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

function latestObservationMs(metric: MacroMetric): number | null {
  const hist = metric.history ?? [];
  if (hist.length) {
    const last = hist[hist.length - 1]?.date;
    return parseObsDate(last);
  }
  return parseObsDate(metric.source?.asOf ?? null);
}

/** Max age before a series is flagged stale (days). */
export function maxAgeDaysForMetric(metric: MacroMetric): number {
  const id = metric.id.toLowerCase();
  const provider = (metric.source?.provider ?? "").toLowerCase();
  if (id.includes("usdinr") || provider.includes("upstox") || provider.includes("yahoo")) return 3;
  if (provider.includes("fred")) return 45;
  if (provider.includes("world bank") || provider.includes("data360")) return 400;
  if (id.includes("unemp") || id.includes("lfpr") || id.includes("plfs")) return 400;
  if (metric.history?.length && /^\d{4}$/.test(metric.history[metric.history.length - 1]?.date ?? "")) {
    return 400;
  }
  return 60;
}

export type MacroMetricAudit = {
  id: string;
  label: string;
  status: "ok" | "stale" | "missing";
  latestObs: string | null;
  ageDays: number | null;
  provider: string;
};

export type MacroSectionAudit = {
  section: MacroSectionId;
  path: string;
  metrics: number;
  withValue: number;
  withHistory: number;
  stale: MacroMetricAudit[];
  missing: MacroMetricAudit[];
  ok: boolean;
};

export type MacroHubSanityReport = {
  checkedAt: string;
  hubFetchedAt: string;
  sections: MacroSectionAudit[];
  ok: boolean;
};

function auditMetric(metric: MacroMetric, now: number): MacroMetricAudit {
  const latestMs = latestObservationMs(metric);
  const ageDays = latestMs != null ? (now - latestMs) / 86_400_000 : null;
  const maxAge = maxAgeDaysForMetric(metric);
  if (metric.value == null && !metric.hint) {
    return {
      id: metric.id,
      label: metric.label,
      status: "missing",
      latestObs: latestMs ? new Date(latestMs).toISOString().slice(0, 10) : null,
      ageDays: ageDays != null ? Math.round(ageDays * 10) / 10 : null,
      provider: metric.source?.provider ?? "—",
    };
  }
  if (latestMs == null) {
    return {
      id: metric.id,
      label: metric.label,
      status: "ok",
      latestObs: null,
      ageDays: null,
      provider: metric.source?.provider ?? "—",
    };
  }
  const stale = ageDays != null && ageDays > maxAge;
  return {
    id: metric.id,
    label: metric.label,
    status: stale ? "stale" : "ok",
    latestObs: new Date(latestMs).toISOString().slice(0, 10),
    ageDays: ageDays != null ? Math.round(ageDays * 10) / 10 : null,
    provider: metric.source?.provider ?? "—",
  };
}

export function auditMacroHub(payload: IndiaMacroHubPayload, now = Date.now()): MacroHubSanityReport {
  const sections: MacroSectionAudit[] = [];

  for (const { id, path } of MACRO_HUB_SECTION_PATHS) {
    const block = payload.sections[id];
    const metrics = block ? sectionMetrics(block) : [];
    const audits = metrics.map((m) => auditMetric(m, now));
    const stale = audits.filter((a) => a.status === "stale");
    const missing = audits.filter((a) => a.status === "missing");
    sections.push({
      section: id,
      path,
      metrics: metrics.length,
      withValue: metrics.filter((m) => m.value != null).length,
      withHistory: metrics.filter((m) => (m.history?.length ?? 0) > 1).length,
      stale,
      missing,
      ok: stale.length === 0 && missing.length === 0,
    });
  }

  return {
    checkedAt: new Date(now).toISOString(),
    hubFetchedAt: payload.fetchedAt,
    sections,
    ok: sections.every((s) => s.ok),
  };
}
