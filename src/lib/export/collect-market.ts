import { buildIndiaDashboard } from "@/lib/feeds/india/build-dashboard";
import type { FieldSource, QuoteField } from "@/lib/feeds/india/types";
import { buildFeedHub } from "@/lib/feeds/hub";
import { buildIndiaMacroHub } from "@/lib/macro/build-hub";
import { buildLiveTicker } from "@/lib/macro/build-live-ticker";
import { buildMacroTape } from "@/lib/macro/build-tape";
import { computeStress } from "@/lib/stress/compute";
import { getBacktest } from "@/lib/stress/backtest";
import { recentAlerts, stressHistory } from "@/lib/stress/store";
import { PRESETS, SHOCK_BOUNDS } from "@/lib/transmission/scenario";
import { getBetas } from "@/lib/transmission/betas";
import type { Col, SheetSpec } from "./workbook";

const src = (s?: FieldSource) => ({ provider: s?.provider ?? "", url: s?.url ?? "", asOf: s?.asOf ?? "" });
const SRC_COLS: Col[] = [
  { header: "Provider", key: "provider", width: 26 },
  { header: "Source link", key: "url", fmt: "link", width: 46 },
  { header: "As of", key: "asOf", width: 22 },
];
const quoteRow = (label: string, q: QuoteField) => ({ label, value: q.value, change: q.change ?? null, changePct: q.changePct ?? null, ...src(q.source) });
const QUOTE_COLS: Col[] = [
  { header: "Metric", key: "label", width: 30 },
  { header: "Value", key: "value", fmt: "num", width: 16 },
  { header: "Change", key: "change", fmt: "num", width: 12 },
  { header: "Change %", key: "changePct", fmt: "pct", width: 12 },
  ...SRC_COLS,
];

/** Market Pulse, indices, breadth, F&O, global radar, money flow, RBI liquidity, India macro, India impact — from the Home dashboard payload. */
export async function dashboardSheets(): Promise<SheetSpec[]> {
  const d = await buildIndiaDashboard();
  const out: SheetSpec[] = [];

  out.push({
    name: "Market Pulse",
    title: "Market Pulse",
    description: "Headline India market indicators shown at the top of the Home page.",
    source: "NSE, BSE, RBI, Upstox, Yahoo Finance (see each row)",
    cols: QUOTE_COLS,
    rows: [
      quoteRow("NIFTY 50", d.pulse.nifty),
      quoteRow("SENSEX", d.pulse.sensex),
      quoteRow("BANK NIFTY", d.pulse.bankNifty),
      quoteRow("India VIX", d.pulse.indiaVix),
      quoteRow("USD/INR", d.pulse.usdInr),
      quoteRow("India 10Y G-Sec yield (%)", d.pulse.gsec10y),
      quoteRow("Brent crude (US$/bbl)", d.pulse.brent),
      quoteRow("Gold (US$/oz)", d.pulse.gold),
    ],
  });

  const idx = [d.indiaMoving.nifty, d.indiaMoving.bankNifty, d.indiaMoving.indiaVix];
  out.push({
    name: "Indices",
    title: "Index Snapshots",
    description: "NIFTY 50, BANK NIFTY and India VIX with day, week, month and year-to-date changes.",
    source: "NSE India, Upstox, Yahoo Finance",
    cols: [
      { header: "Symbol", key: "symbol", width: 14 },
      { header: "Name", key: "name", width: 24 },
      { header: "Last", key: "value", fmt: "num", width: 14 },
      { header: "Day high", key: "high", fmt: "num", width: 14 },
      { header: "Day low", key: "low", fmt: "num", width: 14 },
      { header: "1D %", key: "c1d", fmt: "pct", width: 10 },
      { header: "1W %", key: "c1w", fmt: "pct", width: 10 },
      { header: "1M %", key: "c1m", fmt: "pct", width: 10 },
      { header: "YTD %", key: "ytd", fmt: "pct", width: 10 },
      ...SRC_COLS,
    ],
    rows: idx.map((i) => ({ symbol: i.symbol, name: i.name, value: i.current.value, high: i.high, low: i.low, c1d: i.change1d, c1w: i.change1w, c1m: i.change1m, ytd: i.changeYtd, ...src(i.current.source) })),
  });
  out.push({
    name: "Index History",
    title: "Index History (1 month)",
    description: "Daily closing values behind the index snapshots.",
    source: "NSE India, Yahoo Finance",
    cols: [
      { header: "Symbol", key: "symbol", width: 14 },
      { header: "Date", key: "date", fmt: "date", width: 14 },
      { header: "Value", key: "value", fmt: "num", width: 16 },
    ],
    rows: idx.flatMap((i) => (i.history1m ?? []).map((h) => ({ symbol: i.symbol, date: h.date, value: h.value }))),
  });

  const b = d.indiaMoving.breadth;
  const fo = [d.indiaMoving.fo.nifty, d.indiaMoving.fo.bankNifty];
  out.push({
    name: "Breadth & F&O",
    title: "Market Breadth and Index Derivatives",
    description: "Advances/declines, 52-week highs and lows; put-call ratio, open interest and max pain for index options.",
    source: "NSE India, Upstox",
    cols: [
      { header: "Group", key: "group", width: 18 },
      { header: "Metric", key: "metric", width: 30 },
      { header: "Value", key: "value", fmt: "num", width: 16 },
      ...SRC_COLS,
    ],
    rows: [
      ...[["Advances", b.advances], ["Declines", b.declines], ["Unchanged", b.unchanged], ["52-week highs", b.high52w], ["52-week lows", b.low52w]].map(([m, v]) => ({ group: "Breadth", metric: m, value: v, ...src(b.source) })),
      ...fo.flatMap((f) =>
        [["Put-call ratio", f.pcr], ["Total open interest", f.totalOi], ["Change in OI", f.changeOi], ["Call OI", f.callOi], ["Put OI", f.putOi], ["Max pain strike", f.maxPain]].map(([m, v]) => ({ group: f.symbol, metric: m, value: v, ...src(f.source) })),
      ),
      ...fo.flatMap((f) => [
        ...f.topCallStrikes.map((s, i) => ({ group: f.symbol, metric: `Top call strike #${i + 1} (${s.strike}) OI`, value: s.oi, ...src(f.source) })),
        ...f.topPutStrikes.map((s, i) => ({ group: f.symbol, metric: `Top put strike #${i + 1} (${s.strike}) OI`, value: s.oi, ...src(f.source) })),
      ]),
    ],
  });

  out.push({
    name: "Global Radar",
    title: "Global Radar",
    description: "Global equity indices, volatility, dollar index, yields and commodities that move Indian markets.",
    source: "Yahoo Finance, FRED, Stooq (see each row)",
    cols: QUOTE_COLS,
    rows: Object.entries(d.globalRadar).map(([k, q]) => quoteRow(k, q)),
  });

  const flow = (f: typeof d.moneyFlow.fii) => ({ label: f.label, today: f.today, d5: f.d5, m1: f.m1, ytd: f.ytd, ...src(f.source) });
  out.push({
    name: "Money Flow",
    title: "FII / DII Money Flow",
    description: "Net institutional flows in ₹ crore for today, the last 5 sessions, 1 month and year to date, plus the FII-vs-DII comparison.",
    source: "NSE India provisional FII/DII data",
    cols: [
      { header: "Investor", key: "label", width: 26 },
      { header: "Today (₹ cr)", key: "today", fmt: "num", width: 16 },
      { header: "5 days (₹ cr)", key: "d5", fmt: "num", width: 16 },
      { header: "1 month (₹ cr)", key: "m1", fmt: "num", width: 16 },
      { header: "YTD (₹ cr)", key: "ytd", fmt: "num", width: 16 },
      ...SRC_COLS,
    ],
    rows: [
      flow(d.moneyFlow.fii),
      flow(d.moneyFlow.dii),
      { label: "FII vs DII (net today, ₹ cr) — FII", today: d.moneyFlow.fiiVsDii.fii, ...src(d.moneyFlow.fiiVsDii.source) },
      { label: "FII vs DII (net today, ₹ cr) — DII", today: d.moneyFlow.fiiVsDii.dii, ...src(d.moneyFlow.fiiVsDii.source) },
      ...d.moneyFlow.extras.map((e) => ({ label: e.label, today: e.value, ...src(e.source) })),
    ],
  });

  const rb = d.rbiLiquidity;
  out.push({
    name: "RBI & Liquidity",
    title: "RBI Policy and Rupee Liquidity",
    description: "Policy rates and corridor, system liquidity, forex reserves and the 30-day liquidity trend.",
    source: "Reserve Bank of India (RBI), CCIL",
    cols: [
      { header: "Group", key: "group", width: 20 },
      { header: "Item", key: "item", width: 36 },
      { header: "Value", key: "value", width: 24 },
      ...SRC_COLS,
    ],
    rows: [
      ...rb.rows.map((r) => ({ group: "Rates & liquidity", item: r.label, value: r.value, ...src(r.source) })),
      { group: "System liquidity", item: "System liquidity", value: rb.systemLiquidity.value, ...src(rb.systemLiquidity.source) },
      { group: "System liquidity", item: "7-day change", value: rb.systemLiquidity.change7d, ...src(rb.systemLiquidity.source) },
      { group: "System liquidity", item: "Net liquidity (₹ cr, + injected / − absorbed)", value: rb.systemLiquidity.netCr ?? null, ...src(rb.systemLiquidity.source) },
      ...(rb.systemLiquidity.trend30d ?? []).map((v, i) => ({ group: "30-day trend", item: `Day ${i + 1}`, value: v, ...src(rb.systemLiquidity.source) })),
      ...(rb.fxReserves ? [{ group: "FX reserves", item: `Forex reserves (as of ${rb.fxReserves.asOf ?? "n/a"})`, value: rb.fxReserves.value, ...src(rb.fxReserves.source) }] : []),
      ...Object.entries(rb.corridor ?? {}).map(([k, v]) => ({ group: "Policy corridor", item: k, value: v, provider: "Reserve Bank of India", url: "https://www.rbi.org.in", asOf: "" })),
    ],
  });

  out.push({
    name: "India Macro",
    title: "India Macro Indicators",
    description: "Headline macro indicators from the Home dashboard, with the previous reading and direction.",
    source: "MoSPI, RBI, data.gov.in, World Bank (see each row)",
    cols: [
      { header: "Indicator", key: "indicator", width: 34 },
      { header: "Current", key: "current", fmt: "num", width: 14 },
      { header: "Previous", key: "previous", fmt: "num", width: 14 },
      { header: "Unit", key: "unit", width: 14 },
      { header: "Direction", key: "direction", width: 12 },
      ...SRC_COLS,
    ],
    rows: d.indiaMacro.map((m) => ({ indicator: m.indicator, current: m.current, previous: m.previous, unit: m.unit, direction: m.direction, ...src(m.source) })),
  });
  out.push({
    name: "India Macro History",
    title: "India Macro Indicators — 12-month history",
    description: "Monthly history behind every dashboard macro indicator.",
    source: "MoSPI, RBI, data.gov.in",
    cols: [
      { header: "Indicator", key: "indicator", width: 34 },
      { header: "Date", key: "date", fmt: "date", width: 14 },
      { header: "Value", key: "value", fmt: "num4", width: 14 },
      { header: "Unit", key: "unit", width: 14 },
    ],
    rows: d.indiaMacro.flatMap((m) => m.history12m.map((h) => ({ indicator: m.indicator, date: h.date, value: h.value, unit: m.unit }))),
  });

  out.push({
    name: "India Impact",
    title: "India Impact Score",
    description: "How global drivers currently net out for Indian equities, with each driver's contribution and the methodology.",
    source: "Market Intelligence model over the sources on the Global Radar sheet",
    cols: [
      { header: "Item", key: "item", width: 34 },
      { header: "Value", key: "value", width: 30 },
      { header: "Contribution", key: "contribution", fmt: "num", width: 14 },
    ],
    rows: [
      { item: "Overall label", value: d.indiaImpact.label },
      { item: "Overall score", value: String(d.indiaImpact.score) },
      ...d.indiaImpact.drivers.map((x) => ({ item: x.factor, value: x.value, contribution: x.contribution })),
      { item: "Methodology", value: d.indiaImpact.methodology },
    ],
  });

  // stress index is derived from the same dashboard snapshot
  const s = computeStress(d);
  out.push({
    name: "Stress Index",
    title: "India Macro Stress Index",
    description: `Composite 0–100 stress score (${s.band}) and its seven families and components. Convergence: ${s.convergence.firing.length} famil${s.convergence.firing.length === 1 ? "y" : "ies"} firing, priority ${s.convergence.priority}.`,
    source: "Market Intelligence model; inputs from NSE, RBI, Yahoo Finance, FRED",
    cols: [
      { header: "Level", key: "level", width: 12 },
      { header: "Family", key: "family", width: 20 },
      { header: "Component", key: "label", width: 34 },
      { header: "Reading", key: "display", width: 22 },
      { header: "Score (0–100)", key: "score", fmt: "num", width: 14 },
      { header: "Weight", key: "weight", fmt: "num4", width: 10 },
      { header: "Firing", key: "firing", width: 10 },
    ],
    rows: [
      { level: "Overall", family: "All", label: "India Macro Stress Index", display: s.band, score: s.score },
      ...s.families.map((f) => ({ level: "Family", family: f.label, label: f.label, display: "", score: f.score, firing: f.firing ? "Yes" : "No" })),
      ...s.components.map((c) => ({ level: "Component", family: c.family, label: c.label, display: c.display, score: c.score, weight: c.weight })),
    ],
  });
  return out;
}

export async function macroHubSheets(): Promise<SheetSpec[]> {
  const h = await buildIndiaMacroHub();
  type M = (typeof h.sections)[keyof typeof h.sections]["metrics"][number];
  const flat = (secTitle: string, m: M, parent = ""): { sec: string; m: M; parent: string }[] => [
    { sec: secTitle, m, parent },
    ...(m.children ?? []).flatMap((c) => flat(secTitle, c as M, m.label)),
  ];
  const all = Object.values(h.sections).flatMap((s) => s.metrics.flatMap((m) => flat(s.title, m)));
  return [
    {
      name: "Macro Hub",
      title: "India Macro Hub — all metrics",
      description: "Every metric on the Macro pages (growth, inflation, rates & liquidity, fiscal, consumer, corporate, external, employment, global) with latest value, previous value and source link.",
      source: "MoSPI, RBI, data.gov.in, World Bank, IMF, OECD, FRED (see each row)",
      cols: [
        { header: "Section", key: "sec", width: 22 },
        { header: "Metric", key: "label", width: 40 },
        { header: "Parent", key: "parent", width: 26 },
        { header: "Value", key: "value", fmt: "num4", width: 14 },
        { header: "Unit", key: "unit", width: 12 },
        { header: "Previous", key: "previous", fmt: "num4", width: 14 },
        { header: "Change", key: "change", fmt: "num4", width: 12 },
        { header: "Note", key: "hint", width: 44 },
        ...SRC_COLS,
      ],
      rows: all.map(({ sec, m, parent }) => ({ sec, label: m.label, parent, value: m.value, unit: m.unit, previous: m.previous ?? null, change: m.change ?? null, hint: m.hint ?? "", ...src(m.source) })),
    },
    {
      name: "Macro Hub History",
      title: "India Macro Hub — history",
      description: "Full time series behind every Macro Hub metric.",
      source: "As listed on the Macro Hub sheet",
      cols: [
        { header: "Section", key: "sec", width: 22 },
        { header: "Metric", key: "label", width: 40 },
        { header: "Date", key: "date", fmt: "date", width: 14 },
        { header: "Value", key: "value", fmt: "num4", width: 14 },
        { header: "Unit", key: "unit", width: 12 },
      ],
      rows: all.flatMap(({ sec, m }) => (m.history ?? []).map((p) => ({ sec, label: m.label, date: p.date, value: p.value, unit: m.unit }))),
    },
    {
      name: "Macro Highlights",
      title: "Macro Highlights",
      description: "The written highlights shown at the top of each Macro section.",
      source: "Market Intelligence",
      cols: [
        { header: "Section", key: "sec", width: 24 },
        { header: "Subtitle", key: "sub", width: 50 },
        { header: "Highlight", key: "text", width: 100 },
      ],
      rows: Object.values(h.sections).flatMap((s) => (s.highlights.length ? s.highlights.map((t) => ({ sec: s.title, sub: s.subtitle, text: t })) : [])),
    },
    {
      name: "Macro Regime",
      title: "Macro Regime",
      description: `Current regime: ${h.regime.overallLabel}. Signals by dimension, the regime history and the growth-vs-inflation series.`,
      source: "Market Intelligence regime model over MoSPI, RBI and market data",
      cols: [
        { header: "Type", key: "type", width: 16 },
        { header: "Date / dimension", key: "key", width: 22 },
        { header: "Label / status", key: "label", width: 36 },
        { header: "Tone / quadrant", key: "tone", width: 16 },
        { header: "Growth score", key: "growth", fmt: "num", width: 14 },
        { header: "Inflation score", key: "inflation", fmt: "num", width: 14 },
        { header: "Detail", key: "detail", width: 70 },
      ],
      rows: [
        ...h.regime.signals.map((x) => ({ type: "Signal", key: x.dimension, label: `${x.label}: ${x.status}`, tone: x.tone, detail: x.detail })),
        ...h.regime.history.map((x) => ({ type: "History", key: x.date, label: x.label, tone: x.quadrant, growth: x.growthScore, inflation: x.inflationScore })),
        ...h.regime.growthInflationChart.map((x) => ({ type: "Growth/Inflation", key: x.date, growth: x.growth, inflation: x.inflation })),
      ],
    },
  ];
}

export async function feedHubSheets(): Promise<SheetSpec[]> {
  const f = await buildFeedHub();
  const quote = (type: string) => (q: (typeof f.quotes)[number]) => ({ type, symbol: q.symbol, name: q.name ?? "", price: q.price, change: q.change, changePct: q.changePct / 100, currency: q.currency ?? "", asOf: q.asOf, provider: q.provider });
  return [
    {
      name: "Live Quotes",
      title: "Live Quotes and Indices",
      description: "Quotes and index levels from the live feed hub (India and global).",
      source: "Yahoo Finance, Stooq, Alpha Vantage, Upstox, Massive (provider per row)",
      cols: [
        { header: "Type", key: "type", width: 10 },
        { header: "Symbol", key: "symbol", width: 16 },
        { header: "Name", key: "name", width: 30 },
        { header: "Price", key: "price", fmt: "num", width: 14 },
        { header: "Change", key: "change", fmt: "num", width: 12 },
        { header: "Change %", key: "changePct", fmt: "pct", width: 12 },
        { header: "Currency", key: "currency", width: 10 },
        { header: "As of", key: "asOf", width: 24 },
        { header: "Provider", key: "provider", width: 16 },
      ],
      rows: [...f.indices.map(quote("Index")), ...f.quotes.map(quote("Quote"))],
    },
    {
      name: "Feed Macro Series",
      title: "Feed Hub Macro Series",
      description: "Macro series carried by the feed hub, with the latest reading and full point history.",
      source: "FRED, World Bank, IMF, OECD, MoSPI (source per row)",
      cols: [
        { header: "Series", key: "name", width: 40 },
        { header: "Source", key: "source", width: 12 },
        { header: "Unit", key: "unit", width: 14 },
        { header: "Latest", key: "latest", fmt: "num4", width: 14 },
        { header: "Change", key: "change", fmt: "num4", width: 12 },
        { header: "Date", key: "date", fmt: "date", width: 14 },
        { header: "Value", key: "value", fmt: "num4", width: 14 },
      ],
      rows: f.macro.flatMap((m) => [{ name: m.name, source: m.source, unit: m.unit, latest: m.latest, change: m.change }, ...m.points.map((p) => ({ name: m.name, source: m.source, unit: m.unit, date: p.date, value: p.value }))]),
    },
    {
      name: "News Headlines",
      title: "News Headlines",
      description: "Headlines collected from regulator and market feeds, each linked to the original article.",
      source: "RBI, NSE, BSE, SEC and other feeds (source per row)",
      cols: [
        { header: "Published", key: "publishedAt", width: 24 },
        { header: "Source", key: "source", width: 12 },
        { header: "Headline", key: "title", width: 90 },
        { header: "Link", key: "link", fmt: "link", width: 60 },
      ],
      rows: f.news.map((n) => ({ publishedAt: n.publishedAt ?? "", source: n.source, title: n.title, link: n.link })),
    },
    {
      name: "Feed Health",
      title: "Data Feed Health",
      description: "Status of every upstream data feed at the time of export.",
      source: "Market Intelligence feed monitor",
      cols: [
        { header: "Feed", key: "label", width: 30 },
        { header: "Status", key: "status", width: 10 },
        { header: "Latency (ms)", key: "latencyMs", fmt: "int", width: 14 },
        { header: "Updated", key: "updatedAt", width: 24 },
        { header: "Message", key: "message", width: 60 },
      ],
      rows: f.health.map((x) => ({ label: x.label, status: x.ok ? "OK" : "Down", latencyMs: x.latencyMs, updatedAt: x.updatedAt, message: x.message ?? "" })),
    },
  ];
}

export async function tapeSheets(): Promise<SheetSpec[]> {
  const [t, tick] = await Promise.all([buildMacroTape(), buildLiveTicker()]);
  const tq = (type: string) => (q: (typeof t.commodities)[number]) => ({ type, label: q.label, symbol: q.symbol, price: q.price, changePct: q.changePct == null ? null : q.changePct / 100, ...src(q.source) });
  return [
    {
      name: "Yield Curves",
      title: "Sovereign Yield Curves",
      description: "India and US government yield curves by tenor.",
      source: "CCIL / RBI (India), FRED (US)",
      cols: [{ header: "Curve", key: "curve", width: 12 }, { header: "Tenor", key: "tenor", width: 10 }, { header: "Yield (%)", key: "value", fmt: "num", width: 12 }, ...SRC_COLS],
      rows: [...t.indiaYieldCurve.map((p) => ({ curve: "India", tenor: p.tenor, value: p.value, ...src(p.source) })), ...t.usYieldCurve.map((p) => ({ curve: "US", tenor: p.tenor, value: p.value, ...src(p.source) }))],
    },
    {
      name: "Commodities & FX",
      title: "Commodities and Currencies",
      description: "Commodity and currency quotes from the macro tape.",
      source: "Yahoo Finance, Upstox",
      cols: [{ header: "Type", key: "type", width: 12 }, { header: "Name", key: "label", width: 26 }, { header: "Symbol", key: "symbol", width: 14 }, { header: "Price", key: "price", fmt: "num", width: 14 }, { header: "Change %", key: "changePct", fmt: "pct", width: 12 }, ...SRC_COLS],
      rows: [...t.commodities.map(tq("Commodity")), ...t.currencies.map(tq("Currency"))],
    },
    {
      name: "Transmission Map",
      title: "Brent and USD/INR Transmission",
      description: "Which sectors and stocks typically benefit or come under pressure when Brent or the rupee moves.",
      source: "Market Intelligence transmission model",
      cols: [
        { header: "Driver", key: "driver", width: 22 },
        { header: "Driver level", key: "price", fmt: "num", width: 14 },
        { header: "Driver change %", key: "chg", fmt: "pct", width: 14 },
        { header: "Effect", key: "effect", width: 14 },
        { header: "Sector / stock", key: "name", width: 30 },
        { header: "Direction", key: "direction", width: 12 },
        { header: "Link", key: "href", width: 26 },
      ],
      rows: [t.transmission.brent, t.transmission.usdInr].flatMap((b) => [
        ...b.beneficiaries.map((r) => ({ driver: b.driverLabel, price: b.price, chg: b.changePct == null ? null : b.changePct / 100, effect: "Beneficiary", name: r.name, direction: r.direction, href: r.href ? `${"https://getmarketintelligence.in"}${r.href}` : "" })),
        ...b.pressured.map((r) => ({ driver: b.driverLabel, price: b.price, chg: b.changePct == null ? null : b.changePct / 100, effect: "Pressured", name: r.name, direction: r.direction, href: r.href ? `${"https://getmarketintelligence.in"}${r.href}` : "" })),
      ]),
    },
    {
      name: "Live Ticker",
      title: "Live Ticker Instruments",
      description: "The instruments shown in the site's live ticker.",
      source: "Yahoo Finance, Upstox, NSE",
      cols: [{ header: "Group", key: "group", width: 14 }, { header: "Name", key: "label", width: 26 }, { header: "Symbol", key: "symbol", width: 14 }, { header: "Price", key: "price", fmt: "num", width: 14 }, { header: "Change %", key: "changePct", fmt: "pct", width: 12 }, ...SRC_COLS],
      rows: tick.items.map((i) => ({ group: i.group, label: i.label, symbol: i.symbol, price: i.price, changePct: i.changePct == null ? null : i.changePct / 100, ...src(i.source) })),
    },
  ];
}

export async function stressSheets(): Promise<SheetSpec[]> {
  const [hist, alerts, bt] = await Promise.all([stressHistory(120).catch(() => []), recentAlerts(100).catch(() => []), getBacktest().catch(() => null)]);
  const out: SheetSpec[] = [
    {
      name: "Stress History",
      title: "Stress Index History",
      description: "Recorded stress score and convergence score over time.",
      source: "Market Intelligence stress index",
      cols: [{ header: "Timestamp", key: "ts", width: 24 }, { header: "Stress score", key: "score", fmt: "num", width: 14 }, { header: "Convergence score", key: "convergence", fmt: "num", width: 18 }],
      rows: hist,
    },
    {
      name: "Stress Alerts",
      title: "Stress Convergence Alerts",
      description: "Every time several stress families fired together, with the score at the time.",
      source: "Market Intelligence stress index",
      cols: [{ header: "Fired at", key: "fired_at", width: 24 }, { header: "Priority", key: "priority", width: 12 }, { header: "Families", key: "families", width: 50 }, { header: "Score", key: "score", fmt: "num", width: 10 }],
      rows: alerts.map((a) => ({ fired_at: a.fired_at, priority: a.priority, families: a.families.join(", "), score: a.score })),
    },
  ];
  if (bt) {
    out.push({
      name: "Stress Backtest",
      title: "Stress Index Backtest",
      description: `Reduced market-based stress index vs forward NIFTY returns, ${bt.window[0]} → ${bt.window[1]} (${bt.days} days). Inputs: ${bt.inputs.join(", ")}.`,
      source: "Market Intelligence (Yahoo Finance history)",
      cols: [
        { header: "Group", key: "group", width: 20 },
        { header: "Bucket / measure", key: "bucket", width: 34 },
        { header: "Days", key: "days", fmt: "int", width: 10 },
        { header: "Mean fwd 5d return (%)", key: "mean", fmt: "num", width: 20 },
        { header: "Median fwd 5d return (%)", key: "median", fmt: "num", width: 22 },
        { header: "P(drop ≥ 2%)", key: "pdrop", fmt: "num", width: 14 },
        { header: "Mean max drawdown 10d (%)", key: "dd", fmt: "num", width: 22 },
        { header: "Non-overlapping events", key: "events", fmt: "int", width: 20 },
      ],
      rows: [
        ...bt.buckets.map((b) => ({ group: "Score bucket", bucket: b.bucket, days: b.days, mean: b.meanFwd5, median: b.medianFwd5, pdrop: b.probDrop2pct, dd: b.meanMaxDd10 })),
        { group: "Baseline (all days)", bucket: "All days", days: bt.days, mean: bt.baseline.meanFwd5, pdrop: bt.baseline.probDrop2pct, dd: bt.baseline.meanMaxDd10 },
        { group: "High stress", bucket: `Score ≥ ${bt.high.threshold}`, days: bt.high.days, mean: bt.high.meanFwd5, pdrop: bt.high.probDrop2pct, events: bt.high.nonOverlappingEvents },
        { group: "Convergence", bucket: `${bt.convergence.firingAtLeast}+ families firing`, days: bt.convergence.days, mean: bt.convergence.meanFwd5, pdrop: bt.convergence.probDrop2pct, events: bt.convergence.nonOverlappingEvents },
        { group: "Correlation", bucket: "Stress score vs forward 5-day return", mean: bt.correlationFwd5 },
      ],
    });
  }
  return out;
}

export async function transmissionSheets(): Promise<SheetSpec[]> {
  const b = await getBetas();
  return [
    {
      name: "Sector Betas",
      title: "Sector Sensitivity to Global Factors",
      description: `Regression betas of Indian sector ETFs on Brent, USD/INR, US 10Y yield and the S&P 500 (${b.windowStart} → ${b.windowEnd}). ${b.method}`,
      source: "Yahoo Finance history; Market Intelligence OLS model",
      cols: [
        { header: "Sector", key: "sector", width: 22 },
        { header: "Proxy ETF", key: "proxy", width: 16 },
        { header: "Factor", key: "factor", width: 26 },
        { header: "Beta", key: "beta", fmt: "num4", width: 12 },
        { header: "Std error", key: "se", fmt: "num4", width: 12 },
        { header: "t-stat", key: "t", fmt: "num", width: 10 },
        { header: "R²", key: "r2", fmt: "num4", width: 10 },
        { header: "Observations", key: "n", fmt: "int", width: 14 },
      ],
      rows: b.sectors.flatMap((s) => b.factors.map((f) => ({ sector: s.label, proxy: s.proxy, factor: `${f.label} (${f.unit})`, beta: s.betas[f.id].beta, se: s.betas[f.id].se, t: s.betas[f.id].t, r2: s.r2, n: s.n }))),
    },
    {
      name: "Scenario Presets",
      title: "Macro Scenario Presets",
      description: "The preset shocks offered on the Scenarios page, and the allowed shock ranges.",
      source: "Market Intelligence scenario engine",
      cols: [
        { header: "Preset", key: "label", width: 30 },
        { header: "Brent %", key: "brent", fmt: "num", width: 12 },
        { header: "USD/INR %", key: "usdinr", fmt: "num", width: 12 },
        { header: "US 10Y (bp)", key: "us10y", fmt: "num", width: 12 },
        { header: "S&P 500 %", key: "spx", fmt: "num", width: 12 },
        { header: "Note", key: "note", width: 70 },
      ],
      rows: [
        ...PRESETS.map((p) => ({ label: p.label, brent: p.shocks.brent, usdinr: p.shocks.usdinr, us10y: p.shocks.us10y_bp, spx: p.shocks.spx, note: p.note })),
        { label: "Allowed range — min", brent: SHOCK_BOUNDS.brent[0], usdinr: SHOCK_BOUNDS.usdinr[0], us10y: SHOCK_BOUNDS.us10y_bp[0], spx: SHOCK_BOUNDS.spx[0], note: "Lower bound of each shock" },
        { label: "Allowed range — max", brent: SHOCK_BOUNDS.brent[1], usdinr: SHOCK_BOUNDS.usdinr[1], us10y: SHOCK_BOUNDS.us10y_bp[1], spx: SHOCK_BOUNDS.spx[1], note: "Upper bound of each shock" },
      ],
    },
  ];
}
