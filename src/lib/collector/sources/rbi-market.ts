import { getText, inRange, today } from "../http";
import type { Collector, SeriesResult } from "../types";

const MMO_URL = "https://www.rbi.org.in/Scripts/BS_ViewMMO.aspx";
const HOME_URL = "https://www.rbi.org.in/";

const strip = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

/** Indian digit grouping "-4,34,252.24" → number. */
const num = (s: string) => Number(s.replace(/,/g, ""));

const MONTHS: Record<string, string> = { January: "01", February: "02", March: "03", April: "04", May: "05", June: "06", July: "07", August: "08", September: "09", October: "10", November: "11", December: "12" };
const longDate = (s: string) => {
  const m = /([A-Z][a-z]+) (\d{1,2}), (\d{4})/.exec(s);
  return m && MONTHS[m[1]] ? `${m[3]}-${MONTHS[m[1]]}-${m[2].padStart(2, "0")}` : null;
};

export type RbiLiquidity = { date: string; netCr: number; todayOpsCr: number | null };

/** RBI "Money Market Operations": net liquidity injected (+) / absorbed (−), outstanding incl. today's operations, ₹ crore. */
export async function fetchRbiLiquidity(): Promise<RbiLiquidity> {
  const text = strip(await getText(MMO_URL, { timeoutMs: 30_000 }));
  const f = /F\.\s*Net liquidity injected \(outstanding including today's operations\)[^:]*?\*?\s*(-?[\d,]+\.?\d*)/i.exec(text);
  if (!f) throw new Error("RBI MMO layout changed: net liquidity (F) not found");
  const net = inRange("rbi_net_liquidity", num(f[1]), -2_000_000, 2_000_000);
  const t = /5\.\s*Net liquidity injected from today's operations[^*]*?\*\s*(-?[\d,]+\.?\d*)/i.exec(text);
  // The page is a live 'latest operations' view, so the observation date is the fetch date.
  return { date: today(), netCr: net, todayOpsCr: t ? num(t[1]) : null };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export type RbiHomeMarket = {
  asOf: string;
  call: { low: number; high: number } | null;
  gsecs: { label: string; yield: number }[];
  tbills: { label: string; yield: number }[];
};

/** Scrapes the "Market Trends" block of the RBI home page (call money range, benchmark G-sec yields, T-bill cut-offs). */
export async function fetchRbiHomeMarket(): Promise<RbiHomeMarket> {
  const text = strip(await getText(HOME_URL, { timeoutMs: 30_000 }));
  const start = text.indexOf("Money Market");
  if (start < 0) throw new Error("RBI home layout changed: Market Trends block not found");
  const block = text.slice(start, start + 1600);
  const call = /Call Rates\s*:\s*([\d.]+)%\s*-\s*([\d.]+)%/.exec(block);
  const gsecs = [...block.matchAll(/(\d+\.\d+% GS \d{4})\s*:\s*([\d.]+)%/g)].map((m) => ({ label: m[1], yield: inRange(m[1], Number(m[2]), 0, 20) }));
  const tbills = [...block.matchAll(/(\d+ day T-bills)\s*:\s*([\d.]+)%/g)].map((m) => ({ label: m[1], yield: inRange(m[1], Number(m[2]), 0, 20) }));
  const asOf = longDate(block.slice(block.indexOf("as on"))) ?? today();
  if (!gsecs.length) throw new Error("RBI home layout changed: no G-sec yields parsed");
  return { asOf, call: call ? { low: Number(call[1]), high: Number(call[2]) } : null, gsecs, tbills };
}

export const rbiMarket: Collector = {
  id: "rbi-market",
  async run() {
    const out: SeriesResult[] = [];
    const [liq, home] = await Promise.allSettled([fetchRbiLiquidity(), fetchRbiHomeMarket()]);
    if (liq.status === "fulfilled") {
      out.push({
        id: "rbi_net_liquidity",
        label: "RBI net liquidity injected(+)/absorbed(−), outstanding incl. today's operations",
        unit: "₹ cr",
        category: "rates",
        provider: "Reserve Bank of India (Money Market Operations)",
        url: MMO_URL,
        obs: [{ date: liq.value.date, value: liq.value.netCr, meta: { todayOpsCr: liq.value.todayOpsCr } }],
      });
    }
    if (home.status === "fulfilled") {
      const h = home.value;
      const base = { unit: "%", category: "rates" as const, provider: "Reserve Bank of India (Market Trends)", url: HOME_URL };
      if (h.call) out.push({ ...base, id: "in_call_rate_mid", label: "India call money rate (mid of range)", obs: [{ date: h.asOf, value: (h.call.low + h.call.high) / 2, meta: h.call }] });
      for (const g of h.gsecs) out.push({ ...base, id: `in_gsec_${slug(g.label)}`, label: `India G-sec yield — ${g.label}`, obs: [{ date: h.asOf, value: g.yield }] });
      for (const t of h.tbills) out.push({ ...base, id: `in_tbill_${slug(t.label)}`, label: `India T-bill cut-off — ${t.label}`, obs: [{ date: h.asOf, value: t.yield }] });
    }
    if (!out.length) throw new Error(`RBI market: liquidity: ${liq.status === "rejected" ? String(liq.reason) : "?"}; home: ${home.status === "rejected" ? String(home.reason) : "?"}`);
    return out;
  },
};
