import { seriesHistory } from "../../store";
import type { Collector, SeriesResult } from "../../types";
import { fetchLatestEpfoPayroll } from "./epfo";
import { fetchLatestGstFromPib } from "./gst-pib";
import { fetchNseCorporateProxy } from "./nse-corporate";
import {
  SEED_EPFO_PAYROLL_LAKH,
  SEED_FX_RESERVES_USD_BN,
  SEED_GST_MONTHLY_CR,
  SEED_NAUKRI_JOBSPEAK,
  SEED_UPI_VALUE_LC,
} from "./seeds";
import { fetchUpiFromRbiHome } from "./upi-rbi";

async function mergeSeedAndLive(
  id: string,
  seed: { date: string; value: number; meta?: Record<string, unknown> }[],
  live: { date: string; value: number; meta?: Record<string, unknown> } | null,
): Promise<{ date: string; value: number; meta?: Record<string, unknown> }[]> {
  const existing = await seriesHistory(id, 500).catch(() => []);
  const map = new Map<string, { date: string; value: number; meta?: Record<string, unknown> }>();
  for (const o of existing.length ? existing : seed) map.set(o.date.slice(0, 10), o);
  for (const o of seed) map.set(o.date.slice(0, 10), o);
  if (live) map.set(live.date.slice(0, 10), live);
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export const indiaMacro: Collector = {
  id: "india-macro",
  async run() {
    const [gstLive, upiLive, epfoLive, nseLive] = await Promise.allSettled([
      fetchLatestGstFromPib(),
      fetchUpiFromRbiHome(),
      fetchLatestEpfoPayroll(),
      fetchNseCorporateProxy(),
    ]);

    const out: SeriesResult[] = [];

    const gstObs = await mergeSeedAndLive(
      "in_gst_monthly_cr",
      SEED_GST_MONTHLY_CR,
      gstLive.status === "fulfilled" ? gstLive.value : null,
    );
    out.push({
      id: "in_gst_monthly_cr",
      label: "Gross GST collections (monthly)",
      unit: "₹ cr",
      category: "macro",
      provider: "Ministry of Finance / PIB",
      url: "https://pib.gov.in/",
      obs: gstObs,
    });

    const upiObs = await mergeSeedAndLive(
      "in_upi_monthly_lc",
      SEED_UPI_VALUE_LC,
      upiLive.status === "fulfilled" ? upiLive.value : null,
    );
    out.push({
      id: "in_upi_monthly_lc",
      label: "UPI transaction value (monthly)",
      unit: "₹ L cr",
      category: "macro",
      provider: "NPCI / RBI payment statistics",
      url: "https://www.npci.org.in/",
      obs: upiObs,
    });

    const epfoObs = await mergeSeedAndLive(
      "in_epfo_payroll_lakh",
      SEED_EPFO_PAYROLL_LAKH,
      epfoLive.status === "fulfilled" ? epfoLive.value : null,
    );
    out.push({
      id: "in_epfo_payroll_lakh",
      label: "EPFO net payroll additions",
      unit: "Lakh / month",
      category: "macro",
      provider: "EPFO",
      url: "https://www.epfindia.gov.in/",
      obs: epfoObs,
    });

    out.push({
      id: "in_naukri_jobspeak",
      label: "Naukri JobSpeak hiring index",
      unit: "index",
      category: "macro",
      provider: "Info Edge / Naukri.com",
      url: "https://www.naukri.com/job-speak",
      obs: await mergeSeedAndLive("in_naukri_jobspeak", SEED_NAUKRI_JOBSPEAK, null),
    });

    out.push({
      id: "in_fx_reserves_usd_bn",
      label: "Foreign exchange reserves (RBI WSS baseline)",
      unit: "USD bn",
      category: "macro",
      provider: "Reserve Bank of India (WSS)",
      url: "https://www.rbi.org.in/",
      obs: await mergeSeedAndLive("in_fx_reserves_usd_bn", SEED_FX_RESERVES_USD_BN, null),
    });

    if (nseLive.status === "fulfilled") {
      for (const o of nseLive.value) {
        const kind = (o.meta as { kind?: string })?.kind ?? "nifty50_level";
        const id = kind === "nifty50_yoy_pct" ? "in_nifty50_yoy_pct" : "in_nifty50_level";
        const label = kind === "nifty50_yoy_pct" ? "Nifty 50 return (1Y %)" : "Nifty 50 index level";
        const unit = kind === "nifty50_yoy_pct" ? "% y/y" : "index pts";
        const prev = await seriesHistory(id, 120).catch(() => []);
        const map = new Map(prev.map((p) => [p.date, p]));
        map.set(o.date, o);
        out.push({
          id,
          label,
          unit,
          category: "macro",
          provider: "NSE India",
          url: "https://www.nseindia.com/",
          obs: [...map.values()].sort((a, b) => a.date.localeCompare(b.date)),
        });
      }
    }

    if (!out.length) throw new Error("india-macro: no series produced");
    return out;
  },
};
