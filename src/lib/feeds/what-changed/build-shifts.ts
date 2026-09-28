import { getRbiLiquidity } from "@/lib/collector/rbi-live";
import { fetchFiiDii } from "@/lib/feeds/india/nse-market";
import { fetchIndiaGsec10y } from "@/lib/feeds/india/india-macro";
import { fetchYahooEarningsDate } from "@/lib/feeds/sources/yahoo-calendar";
import { fetchYahooQuotes } from "@/lib/feeds/sources/yahoo";
import type { MarketShiftItem, MarketShiftsPayload } from "@/lib/feeds/what-changed/types";
import { WHAT_CHANGED_REFRESH_MS } from "@/lib/feeds/what-changed/types";

export function shiftsRefreshMs() {
  return WHAT_CHANGED_REFRESH_MS;
}

function fmtCr(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "+";
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
}

function bpsFromPct(pct: number | null | undefined): number {
  if (pct == null || !Number.isFinite(pct)) return 0;
  return Math.round(Math.abs(pct) * 10_000);
}

function parseNetCr(raw?: string): number | null {
  if (!raw) return null;
  const n = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function pctLabel(p: number | null | undefined): string {
  if (p == null || !Number.isFinite(p)) return "—";
  const v = p * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

async function buildSlotFour(slot: number): Promise<MarketShiftItem> {
  const rot = slot % 3;
  if (rot === 0) {
    const watch = ["TCS", "RELIANCE", "INFY", "HDFCBANK"] as const;
    const dates = await Promise.all(watch.map((s) => fetchYahooEarningsDate(s).catch(() => null)));
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = watch
      .map((symbol, i) => ({ symbol, d: dates[i] }))
      .filter((x) => x.d && x.d.date >= today)
      .sort((a, b) => a.d!.date.localeCompare(b.d!.date))[0];
    const sym = upcoming?.symbol ?? "TCS";
    const when = upcoming?.d?.date ?? "the next exchange window";
    return {
      id: "item-4",
      num: "04",
      metricKey: "earnings_results",
      headline: `${sym} earnings on the calendar — review guidance and margin commentary.`,
      tag: "EARNINGS DISCLOSURE",
      tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      dataSummary: `${sym} next reported date on file: ${when}. Compare revenue, EBIT margin, and management commentary with consensus before sizing exposure.`,
      sourceName: "Yahoo Finance calendar events / exchange filings",
      sourceUrl: "https://finance.yahoo.com/",
      methodology: "Next earnings date from Yahoo quoteSummary calendarEvents; filings from NSE/BSE LODR when published.",
      relatedSecurities: [
        { symbol: sym, impact: "Event risk around results" },
        { symbol: sym === "TCS" ? "INFY" : "TCS", impact: "Peer read-through" },
      ],
    };
  }
  if (rot === 1) {
    const liq = await getRbiLiquidity().catch(() => null);
    const net = liq?.netCr ?? null;
    return {
      id: "item-4",
      num: "04",
      metricKey: "rbi_liquidity",
      headline:
        net != null && net < 0
          ? "RBI absorbed surplus liquidity in latest money-market operations."
          : "RBI injected liquidity in latest money-market operations.",
      tag: "RBI OPERATIONS",
      tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
      dataSummary:
        net != null
          ? `System liquidity net ${net >= 0 ? "injection" : "absorption"} of ${fmtCr(net).replace("+", "").replace("−", "−")} per RBI daily money-market statement${liq?.date ? ` (${liq.date})` : ""}.`
          : "Open RBI money-market operations for the latest net LAF / durable liquidity print.",
      sourceName: "Reserve Bank of India — Money Market Operations",
      sourceUrl: "https://www.rbi.org.in/Scripts/BS_ViewMMO.aspx",
      methodology: "Net liquidity from RBI published daily money-market table (₹ crore, injection vs absorption convention).",
      relatedSecurities: [
        { symbol: "HDFCBANK", impact: "Funding cost sensitivity" },
        { symbol: "SBIN", impact: "Treasury & SLR book" },
      ],
    };
  }
  const quotes = await fetchYahooQuotes(["INR=X", "^NSEBANK"]).catch(() => []);
  const inr = quotes.find((q) => q.symbol === "INR=X");
  const bank = quotes.find((q) => q.symbol === "^NSEBANK");
  const weak = (inr?.changePct ?? 0) > 0.001;
  return {
    id: "item-4",
    num: "04",
    metricKey: "usd_inr",
    headline: weak ? "Rupee weakened vs USD in latest session." : "USD/INR moved in latest FX session.",
    tag: "FX & RATES",
    tagColor: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    dataSummary: `USD/INR ${inr?.price?.toFixed(2) ?? "—"} (${pctLabel(inr?.changePct)} session). Nifty Bank ${pctLabel(bank?.changePct)} vs prior close.`,
    sourceName: "Yahoo Finance FX & NSE Bank index",
    sourceUrl: "https://finance.yahoo.com/quote/INR=X",
    methodology: "Spot USD/INR and index percent change vs prior close from consolidated quote feeds.",
    relatedSecurities: [
      { symbol: "TCS", impact: weak ? "Exporter FX tailwind" : "FX translation watch" },
      { symbol: "SUNPHARMA", impact: "USD revenue mix" },
    ],
  };
}

/** Live institutional + macro shifts; content rotates every REFRESH_MS via slot. */
export async function buildMarketShifts(): Promise<MarketShiftsPayload> {
  const slot = Math.floor(Date.now() / WHAT_CHANGED_REFRESH_MS);
  const [fiiRows, gsec, quotes, slotFour] = await Promise.all([
    fetchFiiDii().catch(() => []),
    fetchIndiaGsec10y().catch(() => null),
    fetchYahooQuotes(["^NSEI", "^CNXIT", "BZ=F", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", "TCS.NS", "WIPRO.NS", "BPCL.NS", "ONGC.NS", "ASIANPAINT.NS"]).catch(
      () => [],
    ),
    buildSlotFour(slot),
  ]);

  const q = (sym: string) => quotes.find((x) => x.symbol === sym || x.symbol === sym.replace(".NS", ""));
  const nifty = q("^NSEI");
  const it = q("^CNXIT");
  const brent = q("BZ=F");
  const itSpread =
    nifty?.changePct != null && it?.changePct != null ? it.changePct - nifty.changePct : null;

  const fiiRow = fiiRows.find((r) => r.category.toUpperCase().includes("FII"));
  const diiRow = fiiRows.find((r) => r.category.toUpperCase().includes("DII"));
  const fiiNet = parseNetCr(fiiRow?.netValue);
  const diiNet = parseNetCr(diiRow?.netValue);

  const fiiItem: MarketShiftItem = {
    id: "item-1",
    num: "01",
    metricKey: "fii_flow",
    headline:
      fiiNet == null
        ? "FII/DII flow data pending from NSE."
        : fiiNet < 0
          ? "FII net selling in the latest NSE cash session."
          : "FII net buying in the latest NSE cash session.",
    tag: "INSTITUTIONAL FLOWS",
    tagColor: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    dataSummary:
      fiiNet != null && diiNet != null
        ? `Net FII ${fmtCr(fiiNet)} and DII ${fmtCr(diiNet)} in the latest NSE FII/DII disclosure${fiiRow?.date ? ` (${fiiRow.date})` : ""}.`
        : "NSE FII/DII API did not return a parseable row — retry on the next refresh cycle.",
    sourceName: "NSE FII/DII Daily Trading Activity Report",
    sourceUrl: "https://www.nseindia.com/reports/fii-dii",
    methodology: "Gross buys minus gross sells from NSE-published FII/DII daily cash-market figures.",
    relatedSecurities: [
      { symbol: "HDFCBANK", impact: `${pctLabel(q("HDFCBANK.NS")?.changePct)} session` },
      { symbol: "ICICIBANK", impact: `${pctLabel(q("ICICIBANK.NS")?.changePct)} session` },
      { symbol: "INFY", impact: `${pctLabel(q("INFY.NS")?.changePct)} session` },
    ],
  };

  const gsecVal = gsec?.field.value ?? null;
  const gsecChg = gsec?.field.changePct ?? null;
  const gsecBps = bpsFromPct(gsecChg);
  const gsecItem: MarketShiftItem = {
    id: "item-2",
    num: "02",
    metricKey: "gsec10y",
    headline:
      gsecVal == null
        ? "India 10Y benchmark yield unavailable this cycle."
        : gsecBps >= 1
          ? `10Y G-Sec yield moved ${gsecChg! > 0 ? "higher" : "lower"} (~${gsecBps} bps).`
          : `10Y G-Sec at ${gsecVal.toFixed(2)}% — limited session move.`,
    tag: "SOVEREIGN RATES",
    tagColor: "bg-blue-600/10 text-blue-600 border-blue-600/30",
    dataSummary:
      gsecVal != null
        ? `India 10Y benchmark ${gsecVal.toFixed(2)}% (${pctLabel(gsecChg)} vs prior observation). Source: ${gsec?.field.source?.provider ?? "RBI/FRED"}.`
        : "RBI home page and FRED OECD series used when live NSE g-sec tape is thin.",
    sourceName: gsec?.field.source?.provider ?? "RBI / FRED",
    sourceUrl: gsec?.field.source?.url ?? "https://www.rbi.org.in/",
    methodology: "Published benchmark yield from RBI market trends with FRED OECD long bond fallback.",
    relatedSecurities: [
      { symbol: "NIFTY PSU BANK", impact: "Duration & MTM sensitivity" },
      { symbol: "SBIN", impact: "G-Sec portfolio mark" },
    ],
  };

  const itItem: MarketShiftItem = {
    id: "item-3",
    num: "03",
    metricKey: "nifty50",
    headline:
      itSpread == null
        ? "IT vs NIFTY relative move unavailable."
        : itSpread < -0.002
          ? `IT sector underperformed NIFTY by ${(Math.abs(itSpread) * 100).toFixed(1)}%.`
          : itSpread > 0.002
            ? `IT sector outperformed NIFTY by ${(itSpread * 100).toFixed(1)}%.`
            : "IT sector in line with NIFTY today.",
    tag: "SECTOR DIVERGENCE",
    tagColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    dataSummary: `NIFTY IT ${pctLabel(it?.changePct)} vs NIFTY 50 ${pctLabel(nifty?.changePct)} (price return spread).`,
    sourceName: "NSE sector indices via Yahoo Finance",
    sourceUrl: "https://www.nseindia.com/market-data/live-equity-market",
    methodology: "Session price change spread between ^CNXIT and ^NSEI.",
    relatedSecurities: [
      { symbol: "TCS", impact: `${pctLabel(q("TCS.NS")?.changePct)} vs NIFTY` },
      { symbol: "INFY", impact: `${pctLabel(q("INFY.NS")?.changePct)} vs NIFTY` },
      { symbol: "WIPRO", impact: `${pctLabel(q("WIPRO.NS")?.changePct)} vs NIFTY` },
    ],
  };

  const brentChg = brent?.changePct ?? null;
  const brentItem: MarketShiftItem = {
    id: "item-5",
    num: "05",
    metricKey: "brent",
    headline:
      brentChg == null
        ? "Brent crude quote unavailable this cycle."
        : `Brent crude ${brentChg >= 0 ? "rose" : "fell"} ${Math.abs((brentChg ?? 0) * 100).toFixed(1)}% in the latest session.`,
    tag: "MACRO COMMODITY",
    tagColor: "bg-rose-500/10 text-rose-600 border-rose-500/30",
    dataSummary: `Front-month Brent ${brent?.price != null ? `$${brent.price.toFixed(2)}/bbl` : "—"} (${pctLabel(brentChg)}).`,
    sourceName: "ICE Brent via Yahoo Finance",
    sourceUrl: "https://finance.yahoo.com/quote/BZ=F",
    methodology: "Front-month ICE Brent futures percent change vs prior close.",
    relatedSecurities: [
      { symbol: "BPCL", impact: `${pctLabel(q("BPCL.NS")?.changePct)} OMC sensitivity` },
      { symbol: "ONGC", impact: `${pctLabel(q("ONGC.NS")?.changePct)} upstream` },
      { symbol: "ASIANPAINT", impact: `${pctLabel(q("ASIANPAINT.NS")?.changePct)} input costs` },
    ],
  };

  return {
    fetchedAt: new Date().toISOString(),
    slot,
    items: [fiiItem, gsecItem, itItem, slotFour, brentItem],
  };
}
