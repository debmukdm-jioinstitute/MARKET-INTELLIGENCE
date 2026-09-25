import { hasDatabase, sql, ensureSchema } from "@/lib/db";
import { latestBriefs } from "@/lib/brief/store";
import { collectorStatus, seriesHistory } from "@/lib/collector/store";
import { INDIA_EQUITIES } from "@/lib/feeds/india/instruments";
import { fetchYahooEarningsDate } from "@/lib/feeds/sources/yahoo-calendar";
import { fetchUpstoxIpoList } from "@/lib/feeds/sources/upstox";
import { METRICS_CATALOG } from "@/lib/metrics-catalog";
import { listEvents } from "@/lib/notify/store";
import { listFoUniverse } from "@/lib/options-flow/fo-universe";
import { listOptionsFlowFlagLog } from "@/lib/options-flow/store";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { SCANNERS } from "@/lib/scanner/scanners";
import { loadBacktest, loadScan, loadSignals } from "@/lib/scanner/store";
import type { Col, SheetSpec } from "./workbook";

const SITE = "https://getmarketintelligence.in";

/** Scanner results, catalogue, backtests, equity curves, AI signals and the Nifty 500 universe. */
export async function scannerSheets(): Promise<SheetSpec[]> {
  const [scan, bt, sig] = await Promise.all([loadScan(), loadBacktest(), loadSignals()]);
  const out: SheetSpec[] = [];

  out.push({
    name: "Nifty 500 Universe",
    title: "Nifty 500 Universe",
    description: "The 500 stocks covered by the scanners, backtests and AI signals, with industry and a link to each research page.",
    source: "NSE India (Nifty 500 constituents)",
    cols: [
      { header: "NSE symbol", key: "symbol", width: 16 },
      { header: "Company", key: "name", width: 44 },
      { header: "Industry", key: "industry", width: 28 },
      { header: "Research page", key: "url", fmt: "link", width: 52 },
    ],
    rows: NIFTY_500.map(([symbol, name, industry]) => ({ symbol, name, industry, url: `${SITE}/research/${encodeURIComponent(symbol)}` })),
  });

  const counts = new Map(SCANNERS.map((s) => [s.id, scan?.scanners[s.id]?.length ?? 0]));
  out.push({
    name: "Scanner Catalogue",
    title: "Stock Scanner Catalogue",
    description: `All ${SCANNERS.length} scanners with what each looks for and how many Nifty 500 stocks matched in the latest session (${scan?.lastBar ?? "n/a"}).`,
    source: "Market Intelligence scan engine (definitions follow the open-source PKScreener menu)",
    cols: [
      { header: "Scanner ID", key: "id", width: 20 },
      { header: "Scanner", key: "label", width: 40 },
      { header: "Bias", key: "bias", width: 10 },
      { header: "Matches (latest)", key: "n", fmt: "int", width: 16 },
      { header: "Definition", key: "description", width: 100 },
    ],
    rows: SCANNERS.map((s) => ({ id: s.id, label: s.label, bias: s.bias, n: counts.get(s.id), description: s.description })),
  });

  out.push({
    name: "Scanner Results",
    title: "Scanner Results — latest session",
    description: `Every stock flagged by every scanner in the session ending ${scan?.lastBar ?? "n/a"} (${scan?.scanned ?? 0} of ${scan?.universe ?? 0} stocks scanned). Prices are daily closes.`,
    source: "Yahoo Finance daily prices; Market Intelligence scan engine",
    cols: [
      { header: "Scanner", key: "scanner", width: 36 },
      { header: "Bias", key: "bias", width: 8 },
      { header: "Symbol", key: "symbol", width: 14 },
      { header: "Company", key: "name", width: 36 },
      { header: "Industry", key: "industry", width: 24 },
      { header: "Close (₹)", key: "ltp", fmt: "num", width: 12 },
      { header: "Change %", key: "changePct", fmt: "pctPts", width: 11 },
      { header: "Volume", key: "volume", fmt: "int", width: 14 },
      { header: "Vol × 20d avg", key: "volRatio", fmt: "num", width: 13 },
      { header: "RSI (14)", key: "rsi", fmt: "num", width: 10 },
      { header: "Signal", key: "note", width: 56 },
      { header: "Research page", key: "url", fmt: "link", width: 48 },
    ],
    rows: SCANNERS.flatMap((s) => (scan?.scanners[s.id] ?? []).map((r) => ({ scanner: s.label, bias: s.bias, ...r, url: `${SITE}/research/${encodeURIComponent(r.symbol)}` }))),
  });

  out.push({
    name: "Scanner Backtests",
    title: "Scanner Backtests — performance by holding period",
    description: bt ? `${bt.symbols} Nifty 500 stocks, ${bt.from} → ${bt.to} (${bt.sessions} sessions). ${bt.method}` : "Backtest not available at export time.",
    source: "Yahoo Finance daily prices; Market Intelligence backtest engine",
    cols: [
      { header: "Scanner", key: "label", width: 38 },
      { header: "Bias", key: "bias", width: 8 },
      { header: "Hold (sessions)", key: "days", fmt: "int", width: 14 },
      { header: "Signals", key: "signals", fmt: "int", width: 10 },
      { header: "Win rate %", key: "winRate", fmt: "pctPts", width: 12 },
      { header: "Avg return %", key: "avgRet", fmt: "pctPts", width: 13 },
      { header: "Median %", key: "medRet", fmt: "pctPts", width: 11 },
      { header: "All-stocks avg %", key: "bench", fmt: "pctPts", width: 15 },
      { header: "Edge %", key: "edge", fmt: "pctPts", width: 10 },
      { header: "Worst %", key: "worst", fmt: "pctPts", width: 10 },
      { header: "Best %", key: "best", fmt: "pctPts", width: 10 },
    ],
    rows: (bt?.scanners ?? []).flatMap((s) => s.horizons.map((h) => ({ label: s.label, bias: s.bias, ...h }))),
    notes: ["Signals cluster in time and across stocks, so they are not independent trades. Returns are gross of costs. Back-tested results do not predict future results."],
  });
  out.push({
    name: "Backtest Equity Curves",
    title: "Growth of ₹10,000 — scanner equity curves",
    description: "Daily compounded value of ₹10,000 for every scanner and for the equal-weight Nifty 500 baseline.",
    source: "Market Intelligence backtest engine",
    cols: [{ header: "Series", key: "series", width: 40 }, { header: "Date", key: "d", fmt: "date", width: 14 }, { header: "Value (₹)", key: "v", fmt: "int", width: 14 }],
    rows: bt ? [...bt.benchmarkEquity.map((p) => ({ series: "Nifty 500 equal-weight baseline", ...p })), ...bt.scanners.flatMap((s) => s.equity.map((p) => ({ series: s.label, ...p })))] : [],
  });

  if (sig) {
    const n = sig.nifty;
    out.push({
      name: "AI Signals - Nifty",
      title: "AI Signals — Nifty 50 model",
      description: `Model lean for the next session and next 5 sessions (session ${sig.lastBar}), with its walk-forward validation. The model has not been shown to beat the always-up baseline.`,
      source: "Yahoo Finance (^NSEI); Market Intelligence Lorentzian nearest-neighbour model",
      cols: [
        { header: "Group", key: "group", width: 22 },
        { header: "Item", key: "item", width: 44 },
        { header: "Value", key: "value", fmt: "num4", width: 16 },
        { header: "Detail", key: "detail", width: 50 },
      ],
      rows: [
        { group: "Today", item: "NIFTY 50 close", value: n.close },
        { group: "Today", item: "1-day change %", value: n.changePct / 100 },
        { group: "Today", item: "P(up) next session", value: n.pUp1, detail: n.call1 },
        { group: "Today", item: "P(up) next 5 sessions", value: n.pUp5, detail: n.call5 },
        { group: "Today", item: "20-day EMA", value: n.ema20 },
        { group: "Today", item: "50-day EMA", value: n.ema50, detail: n.trend },
        { group: "Validation", item: "Predictions scored", value: n.validation.days, detail: `${n.validation.from} → ${n.validation.to}` },
        { group: "Validation", item: "Direction accuracy %", value: n.validation.accuracy },
        { group: "Validation", item: "Always-up baseline accuracy %", value: n.validation.alwaysUp },
        { group: "Validation", item: "Model strategy total return %", value: n.validation.strategyReturn },
        { group: "Validation", item: "Buy & hold total return %", value: n.validation.buyHoldReturn },
        ...n.validation.buckets.map((b) => ({ group: "Confidence buckets", item: `${b.label} — days`, value: b.n, detail: b.hitRate == null ? "" : `right ${b.hitRate.toFixed(1)}%, avg next-day ${b.avgRet?.toFixed(2)}%` })),
        ...n.validation.recent.map((r) => ({ group: "Recent predictions", item: r.d, value: r.pUp, detail: `called ${r.call}, actual ${r.actual} (${r.retPct.toFixed(2)}%)` })),
      ],
    });
    const stockRows = (side: string, list: typeof sig.stocks.btst) => list.map((s) => ({ side, ...s, url: `${SITE}/research/${encodeURIComponent(s.symbol)}` }));
    out.push({
      name: "AI Signals - BTST-STBT",
      title: "AI Signals — BTST / STBT candidates (Nifty 500)",
      description: `Candidates from the model run on each stock's history (P(up) ≥ 65% BTST, ≤ 35% STBT). Track record, last ${sig.stocks.validation.sessions} sessions: buy calls ${sig.stocks.validation.buy.n} signals, ${sig.stocks.validation.buy.hitRate.toFixed(1)}% rose next day vs ${sig.stocks.validation.base.upRate.toFixed(1)}% base; sell calls ${sig.stocks.validation.sell.n} signals, ${sig.stocks.validation.sell.hitRate.toFixed(1)}% fell. Targets and stops are ATR-based levels, not model outputs.`,
      source: "Yahoo Finance daily prices; Market Intelligence model",
      cols: [
        { header: "Side", key: "side", width: 8 },
        { header: "Symbol", key: "symbol", width: 14 },
        { header: "Company", key: "name", width: 34 },
        { header: "Industry", key: "industry", width: 22 },
        { header: "P(up)", key: "pUp", fmt: "pct", width: 9 },
        { header: "Close (₹)", key: "ltp", fmt: "num", width: 12 },
        { header: "Change %", key: "changePct", fmt: "pctPts", width: 10 },
        { header: "Entry", key: "entry", fmt: "num", width: 11 },
        { header: "Target", key: "target", fmt: "num", width: 11 },
        { header: "Stop", key: "stop", fmt: "num", width: 11 },
        { header: "RSI", key: "rsi", fmt: "num", width: 8 },
        { header: "Research page", key: "url", fmt: "link", width: 46 },
      ],
      rows: [...stockRows("BTST", sig.stocks.btst), ...stockRows("STBT", sig.stocks.stbt)],
    });
  }
  return out;
}

const rowsOf = async <T>(q: () => Promise<T[]>): Promise<T[]> => (hasDatabase() ? q() : []);

export async function calendarSheets(): Promise<SheetSpec[]> {
  const [earn, ipos] = await Promise.all([
    Promise.allSettled(INDIA_EQUITIES.map((i) => fetchYahooEarningsDate(i.symbol))),
    Promise.allSettled((["open", "upcoming", "closed", "listed"] as const).map((s) => fetchUpstoxIpoList(s).then((l) => l.map((x) => ({ ...x, status: s }))))),
  ]);
  const earnRows = earn.flatMap((r, i) => (r.status === "fulfilled" && r.value ? [{ symbol: INDIA_EQUITIES[i].symbol, name: INDIA_EQUITIES[i].name, date: r.value.date, est: r.value.isEstimate ? "Estimate" : "Confirmed", url: `${SITE}/research/${INDIA_EQUITIES[i].symbol}` }] : [])).sort((a, b) => a.date.localeCompare(b.date));
  const ipoRows = ipos.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return [
    {
      name: "Earnings Dates",
      title: "Upcoming Earnings Dates",
      description: "Next results date on file for each tracked large-cap stock.",
      source: "Yahoo Finance calendar events",
      cols: [{ header: "Symbol", key: "symbol", width: 14 }, { header: "Company", key: "name", width: 34 }, { header: "Date", key: "date", fmt: "date", width: 14 }, { header: "Basis", key: "est", width: 12 }, { header: "Research page", key: "url", fmt: "link", width: 46 }],
      rows: earnRows,
    },
    {
      name: "IPOs",
      title: "IPO Pipeline",
      description: "Open, upcoming, closed and recently listed IPOs (mainboard and SME).",
      source: "Upstox IPO data",
      cols: [
        { header: "Status", key: "status", width: 10 },
        { header: "Symbol", key: "symbol", width: 14 },
        { header: "Company", key: "name", width: 36 },
        { header: "Type", key: "issueType", width: 10 },
        { header: "Industry", key: "industry", width: 24 },
        { header: "Issue size (₹)", key: "issueSize", fmt: "int", width: 16 },
        { header: "Min price (₹)", key: "minPrice", fmt: "num", width: 12 },
        { header: "Max price (₹)", key: "maxPrice", fmt: "num", width: 12 },
        { header: "Bidding opens", key: "biddingStartDate", width: 14 },
        { header: "Bidding closes", key: "biddingEndDate", width: 14 },
        { header: "Total subscription", key: "totalSubscription", width: 18 },
        { header: "ISIN", key: "isin", width: 16 },
      ],
      rows: ipoRows,
    },
  ];
}

export async function databaseSheets(): Promise<SheetSpec[]> {
  const out: SheetSpec[] = [];

  // options flow
  const [flags, fo] = await Promise.all([listOptionsFlowFlagLog(500).catch(() => []), listFoUniverse().catch(() => [])]);
  out.push({
    name: "Options Flow Flags",
    title: "Options Flow — flag log",
    description: "Every unusual options-activity flag raised by the screener, with the price at the time.",
    source: "Upstox option chains; Market Intelligence options-flow screener",
    cols: [{ header: "Date", key: "flagged_date", fmt: "date", width: 14 }, { header: "Symbol", key: "symbol", width: 14 }, { header: "Headline", key: "headline", width: 90 }, { header: "Confidence", key: "confidence", width: 12 }, { header: "Price at flag (₹)", key: "price_at_flag", fmt: "num", width: 16 }],
    rows: flags,
  });
  out.push({
    name: "F&O Universe",
    title: "F&O Universe",
    description: "Optionable NSE stocks covered by the options-flow screener.",
    source: "Upstox instrument master",
    cols: [{ header: "Symbol", key: "symbol", width: 16 }, { header: "Name", key: "name", width: 40 }, { header: "ISIN", key: "isin", width: 18 }, { header: "Instrument key", key: "instrumentKey", width: 26 }],
    rows: fo,
  });
  if (hasDatabase()) {
    await ensureSchema();
    const snaps = await rowsOf(() => sql()`SELECT snapshot_date, symbol, record FROM options_flow_snapshots ORDER BY snapshot_date DESC, symbol LIMIT 20000`).catch(() => []);
    const v = (f: { status?: string; value?: unknown } | undefined) => (f && f.status === "ok" ? f.value : null);
    out.push({
      name: "Options Flow Snapshots",
      title: "Options Flow — daily snapshots",
      description: "Dated price, volume and options-volume snapshots per F&O stock, used as the baseline for flags.",
      source: "Upstox; Yahoo Finance",
      cols: [
        { header: "Date", key: "date", fmt: "date", width: 14 }, { header: "Symbol", key: "symbol", width: 14 }, { header: "Price (₹)", key: "price", fmt: "num", width: 12 },
        { header: "Change %", key: "chg", fmt: "pctPts", width: 10 }, { header: "Volume", key: "vol", fmt: "int", width: 14 }, { header: "30d avg volume", key: "vol30", fmt: "int", width: 15 },
        { header: "Calls volume", key: "calls", fmt: "int", width: 14 }, { header: "Puts volume", key: "puts", fmt: "int", width: 14 }, { header: "Next earnings", key: "earn", width: 14 }, { header: "Corporate action", key: "ca", width: 24 },
      ],
      rows: snaps.map((s) => {
        const r = s.record as Record<string, { status?: string; value?: unknown }>;
        return { date: s.snapshot_date, symbol: s.symbol, price: v(r.price), chg: v(r.priceChangePct), vol: v(r.volume), vol30: v(r.volumeAvg30), calls: v(r.callsVolume), puts: v(r.putsVolume), earn: v(r.earningsEvent), ca: v(r.corporateActionEvent) };
      }),
    });

    // broker research
    const rr = await rowsOf(() => sql()`SELECT source, broker, title, url, summary, published_at, scraped_at FROM research_reports ORDER BY COALESCE(published_at, scraped_at) DESC LIMIT 5000`).catch(() => []);
    out.push({
      name: "Research Reports",
      title: "Broker Research Reports",
      description: "Broker recommendations and research headlines collected from public feeds, each linked to the original article.",
      source: "Economic Times, LiveMint (public research feeds)",
      cols: [{ header: "Published", key: "published_at", width: 22 }, { header: "Broker", key: "broker", width: 24 }, { header: "Title", key: "title", width: 80 }, { header: "Summary", key: "summary", width: 80 }, { header: "Feed", key: "source", width: 18 }, { header: "Link", key: "url", fmt: "link", width: 60 }],
      rows: rr,
    });

    // open data
    const ds = await rowsOf(() => sql()`SELECT id, title, org, sector, tracked, rows_synced, source_total, last_synced_at, source_updated_at FROM datagov_datasets WHERE tracked ORDER BY title`).catch(() => []);
    out.push({
      name: "Open Data Datasets",
      title: "Open Government Data — tracked datasets",
      description: "data.gov.in datasets mirrored by the platform.",
      source: "data.gov.in (Open Government Data Platform India)",
      cols: [{ header: "Dataset", key: "title", width: 70 }, { header: "Organisation", key: "orgs", width: 36 }, { header: "Sector", key: "sectors", width: 26 }, { header: "Rows synced", key: "rows_synced", fmt: "int", width: 12 }, { header: "Source total", key: "source_total", fmt: "int", width: 12 }, { header: "Last synced", key: "last_synced_at", width: 22 }, { header: "Resource ID", key: "id", width: 38 }, { header: "Dataset link", key: "link", fmt: "link", width: 56 }],
      rows: ds.map((d) => ({ ...d, orgs: (d.org as string[] | null)?.join(", ") ?? "", sectors: (d.sector as string[] | null)?.join(", ") ?? "", link: `https://data.gov.in/resource/${d.id}` })),
    });
    const recs = await rowsOf(() => sql()`SELECT r.dataset_id, d.title, r.data FROM datagov_records r JOIN datagov_datasets d ON d.id = r.dataset_id WHERE d.tracked ORDER BY r.dataset_id, r.first_seen LIMIT 40000`).catch(() => []);
    const keys = [...new Set(recs.flatMap((r) => Object.keys(r.data as object)))].slice(0, 30);
    out.push({
      name: "Open Data Records",
      title: "Open Government Data — records",
      description: `Rows of the tracked datasets (up to 40,000). Columns vary by dataset; ${keys.length} distinct fields shown, all values as published.`,
      source: "data.gov.in",
      cols: [{ header: "Dataset", key: "title", width: 50 }, ...keys.map((k): Col => ({ header: k, key: `f_${k}`, width: 18 }))],
      rows: recs.map((r) => ({ title: r.title, ...Object.fromEntries(keys.map((k) => [`f_${k}`, (r.data as Record<string, unknown>)[k]])) })),
    });

    // collected series
    const status = (await collectorStatus().catch(() => [])) as unknown as Record<string, unknown>[];
    const series = status.filter((s) => !String(s.id).startsWith("collector:"));
    out.push({
      name: "Collected Series",
      title: "Collected Series — catalogue and freshness",
      description: "Every series pulled by the automated collectors (RBI, Cboe VIX, CFTC, BLS, ECB, AMFI, Damodaran, FRED), its latest date and status.",
      source: "See provider and link per row",
      cols: [{ header: "Series ID", key: "id", width: 28 }, { header: "Label", key: "label", width: 44 }, { header: "Category", key: "category", width: 14 }, { header: "Unit", key: "unit", width: 14 }, { header: "Points", key: "points", fmt: "int", width: 10 }, { header: "Latest date", key: "latest_date", fmt: "date", width: 14 }, { header: "Last OK", key: "last_ok", width: 22 }, { header: "Last error", key: "last_error", width: 40 }, { header: "Provider", key: "provider", width: 26 }, { header: "Source link", key: "url", fmt: "link", width: 56 }],
      rows: series,
    });
    const hist = await Promise.all(series.map(async (s) => ({ s, pts: await seriesHistory(String(s.id), 20000).catch(() => []) })));
    out.push({
      name: "Collected Series Data",
      title: "Collected Series — observations",
      description: "Full observation history for every collected series.",
      source: "See Collected Series sheet",
      cols: [{ header: "Series ID", key: "id", width: 28 }, { header: "Label", key: "label", width: 44 }, { header: "Date", key: "date", fmt: "date", width: 14 }, { header: "Value", key: "value", fmt: "num4", width: 16 }, { header: "Unit", key: "unit", width: 12 }],
      rows: hist.flatMap(({ s, pts }) => (pts as { obs_date: string; value: number }[]).map((p) => ({ id: s.id, label: s.label, date: p.obs_date, value: p.value, unit: s.unit }))),
    });
  }

  // daily briefs
  const briefs = await latestBriefs(20);
  out.push({
    name: "Daily Briefs",
    title: "Daily Briefs",
    description: "Pre-market and post-close briefs. Every point cites the fact IDs it is based on (see Brief Facts).",
    source: "Market Intelligence (grounded in the data on the other sheets)",
    cols: [{ header: "Generated", key: "generatedAt", width: 24 }, { header: "Brief", key: "kind", width: 12 }, { header: "Engine", key: "engine", width: 8 }, { header: "Headline", key: "headline", width: 70 }, { header: "Theme", key: "theme", width: 24 }, { header: "Stance", key: "stance", width: 12 }, { header: "Point", key: "text", width: 90 }, { header: "Fact IDs", key: "sources", width: 24 }],
    rows: briefs.flatMap((b) => (b.items.length ? b.items.map((i) => ({ generatedAt: b.generatedAt, kind: b.kind, engine: b.engine, headline: b.headline, theme: i.theme, stance: i.stance, text: i.text, sources: i.sources.join(", ") })) : [{ generatedAt: b.generatedAt, kind: b.kind, engine: b.engine, headline: b.headline }])),
  });
  out.push({
    name: "Brief Facts & Headlines",
    title: "Daily Briefs — facts and headlines",
    description: "The facts each brief was allowed to use and the news headlines it considered, with source links.",
    source: "As listed per row",
    cols: [{ header: "Generated", key: "generatedAt", width: 24 }, { header: "Brief", key: "kind", width: 10 }, { header: "Type", key: "type", width: 10 }, { header: "ID / source", key: "id", width: 24 }, { header: "Label / title", key: "label", width: 70 }, { header: "Value", key: "value", width: 24 }, { header: "Provider", key: "provider", width: 24 }, { header: "Link", key: "link", fmt: "link", width: 60 }],
    rows: briefs.flatMap((b) => [...b.facts.map((f) => ({ generatedAt: b.generatedAt, kind: b.kind, type: "Fact", id: f.id, label: f.label, value: f.value, provider: f.provider })), ...b.headlines.map((h) => ({ generatedAt: b.generatedAt, kind: b.kind, type: "Headline", id: h.source, label: h.title, link: h.link }))]),
  });

  // notification feed
  const ev = await listEvents(300).catch(() => []);
  out.push({
    name: "Change Log",
    title: "What Changed — notification feed",
    description: "Every significant data change announced by the notification bell, with a link to the page that shows it.",
    source: "Market Intelligence change detection",
    cols: [{ header: "Detected", key: "at", width: 24 }, { header: "Category", key: "category", width: 12 }, { header: "Importance", key: "severity", width: 12 }, { header: "Change", key: "title", width: 60 }, { header: "Detail", key: "body", width: 90 }, { header: "Page", key: "url", fmt: "link", width: 50 }],
    rows: ev.map((e) => ({ ...e, url: `${SITE}${e.href}` })),
  });

  return out;
}

export function referenceSheets(): SheetSpec[] {
  const m = Object.values(METRICS_CATALOG);
  return [
    {
      name: "Metric Definitions",
      title: "Metric Definitions",
      description: "Every metric shown on the platform: what it is, how it is calculated, why it matters, and where it comes from.",
      source: "Market Intelligence metric catalogue",
      cols: [
        { header: "Category", key: "category", width: 24 },
        { header: "Metric", key: "name", width: 36 },
        { header: "Plain-English meaning", key: "laymanExplanation", width: 70 },
        { header: "How it is calculated", key: "calculation", width: 70 },
        { header: "Why it matters", key: "utility", width: 60 },
        { header: "Provider", key: "provider", width: 30 },
        { header: "Source link", key: "defaultUrl", fmt: "link", width: 50 },
      ],
      rows: m.map((x) => ({ ...x })),
    },
  ];
}
