import { feedFetch } from "@/lib/feeds/http";
import type { Collector, Obs, SeriesResult } from "../types";

const URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const SERIES = [
  { bls: "CUUR0000SA0", id: "us_cpi_index", label: "US CPI-U index (all items, NSA)", unit: "index", yoy: "us_cpi_yoy" },
  { bls: "LNS14000000", id: "us_unemployment", label: "US unemployment rate", unit: "%" },
  { bls: "CES0000000001", id: "us_payrolls", label: "US nonfarm payrolls", unit: "thousands" },
];

export const bls: Collector = {
  id: "bls",
  async run() {
    const y = new Date().getUTCFullYear();
    const res = await feedFetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesid: SERIES.map((s) => s.bls), startyear: String(y - 3), endyear: String(y), ...(process.env.BLS_API_KEY ? { registrationkey: process.env.BLS_API_KEY } : {}) }),
      timeoutMs: 25_000,
    });
    const json = (await res.json()) as { status: string; message?: string[]; Results?: { series: { seriesID: string; data: { year: string; period: string; value: string }[] }[] } };
    if (json.status !== "REQUEST_SUCCEEDED" || !json.Results) throw new Error(`BLS: ${json.message?.join("; ") ?? json.status}`);
    const out: SeriesResult[] = [];
    for (const s of SERIES) {
      const raw = json.Results.series.find((x) => x.seriesID === s.bls);
      const obs: Obs[] = (raw?.data ?? [])
        .filter((d) => /^M(0[1-9]|1[0-2])$/.test(d.period) && Number.isFinite(Number(d.value)))
        .map((d) => ({ date: `${d.year}-${d.period.slice(1)}-01`, value: Number(d.value) }))
        .sort((a, b) => a.date.localeCompare(b.date));
      if (!obs.length) throw new Error(`BLS: no data for ${s.bls}`);
      const base = { provider: "US Bureau of Labor Statistics", url: URL, category: "macro" as const };
      out.push({ ...base, id: s.id, label: s.label, unit: s.unit, obs });
      if (s.yoy) {
        const byDate = new Map(obs.map((o) => [o.date, o.value]));
        const yoy = obs.flatMap((o) => {
          const prev = byDate.get(`${Number(o.date.slice(0, 4)) - 1}${o.date.slice(4)}`);
          return prev ? [{ date: o.date, value: (o.value / prev - 1) * 100 }] : [];
        });
        out.push({ ...base, id: s.yoy, label: "US CPI inflation (YoY)", unit: "%", obs: yoy });
      }
    }
    return out;
  },
};
