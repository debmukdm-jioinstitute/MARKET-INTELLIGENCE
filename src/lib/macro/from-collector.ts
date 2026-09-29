import { latestPoints, seriesHistory } from "@/lib/collector/store";
import type { MacroMetric } from "@/lib/macro/types";

const META: Record<string, { label: string; unit: string; provider: string; url: string }> = {
  in_gst_monthly_cr: {
    label: "Gross GST collections (monthly)",
    unit: "₹ cr",
    provider: "Ministry of Finance / PIB",
    url: "https://pib.gov.in/",
  },
  in_upi_monthly_lc: {
    label: "UPI monthly transaction value",
    unit: "₹ L cr",
    provider: "NPCI / RBI",
    url: "https://www.npci.org.in/",
  },
  in_epfo_payroll_lakh: {
    label: "EPFO monthly net payroll additions",
    unit: "Lakh subscribers / month",
    provider: "EPFO",
    url: "https://www.epfindia.gov.in/",
  },
  in_naukri_jobspeak: {
    label: "Naukri JobSpeak hiring index",
    unit: "index",
    provider: "Info Edge / Naukri.com",
    url: "https://www.naukri.com/job-speak",
  },
  in_fx_reserves_usd_bn: {
    label: "Foreign exchange reserves",
    unit: "USD bn",
    provider: "Reserve Bank of India (WSS)",
    url: "https://www.rbi.org.in/",
  },
  in_nifty50_yoy_pct: {
    label: "Nifty 50 earnings / market proxy (1Y %)",
    unit: "% y/y",
    provider: "NSE India",
    url: "https://www.nseindia.com/",
  },
  in_nifty50_level: {
    label: "Nifty 50 index level",
    unit: "index pts",
    provider: "NSE India",
    url: "https://www.nseindia.com/",
  },
  rbi_repo: {
    label: "Policy repo rate",
    unit: "%",
    provider: "Reserve Bank of India (MPC)",
    url: "https://www.rbi.org.in/scripts/PolicyRates.aspx",
  },
  rbi_net_liquidity: {
    label: "Net systemic liquidity surplus",
    unit: "₹ cr",
    provider: "Reserve Bank of India (WSS)",
    url: "https://www.rbi.org.in/",
  },
  india_fx_reserves_ex_gold: {
    label: "FX reserves excl. gold (IMF via FRED)",
    unit: "USD bn",
    provider: "IMF via FRED",
    url: "https://fred.stlouisfed.org/series/TRESEGINM052N",
  },
};

function obsToHistory(obs: { date: string; value: number }[]) {
  return obs.map((o) => ({
    date: o.date.length >= 7 ? o.date.slice(0, 7) : o.date,
    value: o.value,
  }));
}

/** Load macro desk metrics from Neon collector tables (scheduled india-macro + RBI crawlers). */
export async function loadCollectorMacroMap(ids: string[]): Promise<Map<string, MacroMetric>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();

  const [points, ...histories] = await Promise.all([
    latestPoints(unique),
    ...unique.map((id) => seriesHistory(id, 60)),
  ]);

  const histById = new Map(unique.map((id, i) => [id, histories[i] ?? []]));
  const pointById = new Map(points.map((p) => [p.id, p]));
  const out = new Map<string, MacroMetric>();

  for (const id of unique) {
    const hist = histById.get(id) ?? [];
    const pt = pointById.get(id);
    const last = hist[hist.length - 1];
    const prev = hist[hist.length - 2];
    const value = pt?.value ?? last?.value ?? null;
    const previous = pt?.prev ?? prev?.value ?? null;
    if (value == null && !hist.length) continue;
    const m = META[id];

    out.set(id, {
      id,
      label: m?.label ?? id,
      value,
      previous,
      change: value != null && previous != null ? value - previous : undefined,
      unit: m?.unit ?? "—",
      history: obsToHistory(hist),
      source: {
        provider: m?.provider ?? "Collector",
        url: m?.url ?? "/data/health",
        asOf: pt?.date ?? last?.date ?? undefined,
      },
    });
  }

  return out;
}

export function applyCollectorMetric(
  map: Map<string, MacroMetric>,
  id: string,
  fallback: MacroMetric,
): MacroMetric {
  const hit = map.get(id);
  if (!hit || (hit.value == null && !hit.history.length)) return fallback;
  return {
    ...fallback,
    ...hit,
    label: fallback.label,
    unit: fallback.unit,
    hint: fallback.hint,
    children: fallback.children,
    source: {
      ...fallback.source,
      asOf: hit.source.asOf ?? fallback.source.asOf,
      provider: hit.history.length ? `${fallback.source.provider} · collector` : fallback.source.provider,
      url: hit.source.url.startsWith("/") ? fallback.source.url : hit.source.url,
    },
    history: hit.history.length ? hit.history : fallback.history,
  };
}
