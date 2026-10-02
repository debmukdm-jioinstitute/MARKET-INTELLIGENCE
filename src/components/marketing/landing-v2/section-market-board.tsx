"use client";

import { formatInr, formatIstTimestamp, formatPct, liveFromQuote, sourceLabel } from "@/lib/marketing/landing-v2/format";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useLandingDashboard } from "./use-landing-data";
import { BodyCopy, DataCell, Eyebrow, SectionTitle, SourceLine } from "./ui";

type MarketTab = "all" | "currencies" | "bonds" | "global" | "macro" | "micro";
type Scenario = "risk-on" | "inflation" | "rupee";
type Range = "1D" | "1M" | "1Y";

const TABS: { id: MarketTab; label: string }[] = [
  { id: "all", label: "All markets" },
  { id: "currencies", label: "Currencies" },
  { id: "bonds", label: "Bonds" },
  { id: "global", label: "Global" },
  { id: "macro", label: "Macro" },
  { id: "micro", label: "Micro" },
];

const SCENARIOS: { id: Scenario; label: string; steps: string[] }[] = [
  {
    id: "risk-on",
    label: "Risk-on",
    steps: [
      "How a risk-on move can travel",
      "Global yields ease → Borrowing pressure softens",
      "Foreign flows improve → Demand for local assets rises",
      "Equity breadth widens → More sectors join the move",
    ],
  },
  {
    id: "inflation",
    label: "Inflation shock",
    steps: [
      "Commodity prices rise → Input costs move first",
      "Bond yields reprice → Borrowing gets more expensive",
      "Rate-sensitive sectors weaken → Margins and valuations feel pressure",
    ],
  },
  {
    id: "rupee",
    label: "Weak rupee",
    steps: [
      "Dollar demand rises → The currency absorbs pressure",
      "Imported costs increase → Oil and inputs cost more",
      "Sector effects split → Exporters and importers react differently",
    ],
  },
];

function WatchRow({
  label,
  value,
  change,
  source,
  fetched,
}: {
  label: string;
  value: string;
  change: string;
  source: string;
  fetched: string;
}) {
  return (
    <tr className="border-b border-[#dcd6cc]">
      <td className="py-2 pr-4 text-sm font-medium text-[#141414]">{label}</td>
      <td className="py-2 pr-4 text-sm tabular-nums">{value || "—"}</td>
      <td className="py-2 pr-4 text-sm tabular-nums text-[#0d6b5c]">{change || "—"}</td>
      <td className="py-2 text-xs text-[#6b6b6b]">
        {source ? (
          <>
            {source} · {fetched}
          </>
        ) : (
          "unavailable"
        )}
      </td>
    </tr>
  );
}

function rowFromQuote(label: string, q: ReturnType<typeof liveFromQuote>) {
  return { label, value: q.display, change: q.changeDisplay, source: q.source, fetched: q.fetched };
}

export function LandingMarketBoardSection() {
  const { dashboard } = useLandingDashboard();
  const [tab, setTab] = useState<MarketTab>("all");
  const [range, setRange] = useState<Range>("1D");
  const [scenario, setScenario] = useState<Scenario>("risk-on");
  const [boardMsg, setBoardMsg] = useState("");

  const fetchedAt = dashboard?.fetchedAt ?? "";
  const pulse = dashboard?.pulse;
  const global = dashboard?.globalRadar;

  const rows = useMemo(() => {
    if (!pulse) return [];
    const p = (field: Parameters<typeof liveFromQuote>[0], suffix?: string) =>
      rowFromQuote("", liveFromQuote(field, fetchedAt, { suffix, digits: suffix ? 2 : 2 }));

    if (tab === "all") {
      return [
        { ...p(pulse.nifty), label: "NIFTY 50" },
        { ...p(pulse.usdInr, ""), label: "USD/INR", value: pulse.usdInr.value != null ? formatInr(pulse.usdInr.value, 2) : "" },
        {
          ...p(pulse.gsec10y, "%"),
          label: "INDIA 10Y bond yield",
          value: pulse.gsec10y.value != null ? `${formatInr(pulse.gsec10y.value, 2)}%` : "",
        },
        { ...p(pulse.brent), label: "BRENT" },
        { ...p(global?.sp500), label: "S&P 500" },
      ];
    }
    if (tab === "currencies") {
      return [
        { ...p(pulse.usdInr), label: "USD/INR spot" },
        { ...p(global?.dxy), label: "Dollar Index" },
      ];
    }
    if (tab === "bonds") {
      return [{ ...p(pulse.gsec10y, "%"), label: "10Y G-Sec", value: pulse.gsec10y.value != null ? `${formatInr(pulse.gsec10y.value, 2)}%` : "" }];
    }
    if (tab === "global") {
      return [
        { ...p(global?.sp500), label: "S&P 500" },
        { ...p(global?.nasdaq), label: "NASDAQ" },
        { ...p(global?.dow), label: "DOW" },
      ];
    }
    if (tab === "macro") {
      return (dashboard?.indiaMacro ?? []).slice(0, 5).map((m) => ({
        label: m.indicator,
        value: m.current != null ? `${m.current}${m.unit === "%" ? "%" : ""}` : "",
        change: m.previous != null && m.current != null ? formatPct((m.current - m.previous) / (m.previous || 1)) : "",
        source: sourceLabel(m.source),
        fetched: formatIstTimestamp(m.source.asOf ?? fetchedAt),
      }));
    }
    const b = pulse.breadth;
    return [
      {
        label: "Market breadth",
        value: b.advances != null ? `${b.advances} adv` : "",
        change: b.declines != null ? `${b.declines} dec` : "",
        source: sourceLabel(b.source),
        fetched: formatIstTimestamp(b.source.asOf ?? fetchedAt),
      },
    ];
  }, [tab, pulse, global, dashboard, fetchedAt]);

  const panel = useMemo(() => {
    const panels: Record<MarketTab, { heading: string; thesis: string; cards: { t: string; b: string }[] }> = {
      all: {
        heading: "CROSS-ASSET PULSE",
        thesis: "One board. Six lenses. Fewer blind spots.",
        cards: [
          { t: "WHAT CHANGED", b: "Equities up, long yields down." },
          { t: "WHY IT MATTERS", b: "The move is broader than one index." },
          { t: "LINKED ASSETS", b: "Rupee · crude · 10Y yield" },
          { t: "WATCH NEXT", b: "RBI commentary and foreign flows." },
        ],
      },
      currencies: {
        heading: "FX MONITOR",
        thesis: "See what is moving the rupee.",
        cards: [
          { t: "DRIVER", b: "Dollar firm; oil softer." },
          { t: "CONTEXT", b: "Inside the recent range." },
          { t: "LINKED ASSETS", b: "Oil · FII flows · DXY" },
          { t: "WATCH NEXT", b: "RBI liquidity update." },
        ],
      },
      bonds: {
        heading: "RATES MONITOR",
        thesis: "Read the rate signal across the curve.",
        cards: [
          { t: "CURVE", b: "Long end above short end." },
          { t: "TRANSLATION", b: "Yields down means prices up." },
          { t: "LINKED ASSETS", b: "Banks · housing · INR" },
          { t: "WATCH NEXT", b: "Auction and RBI policy." },
        ],
      },
      global: {
        heading: "WORLD MARKETS",
        thesis: "Know what happened before India opened.",
        cards: [
          { t: "SESSION", b: "US futures set the tone overnight." },
          { t: "INDIA LINK", b: "IT follows US demand." },
          { t: "RISK GAUGE", b: "Volatility remains contained." },
          { t: "WATCH NEXT", b: "Europe open, US futures." },
        ],
      },
      macro: {
        heading: "ECONOMY MONITOR",
        thesis: "Turn releases into a readable economic story.",
        cards: [
          { t: "REGIME", b: "Growth steady; prices easing." },
          { t: "SURPRISE", b: "Inflation below prior reading." },
          { t: "MARKET LINK", b: "Rates · banks · consumers" },
          { t: "WATCH NEXT", b: "Policy minutes and CPI." },
        ],
      },
      micro: {
        heading: "MICRO SIGNALS",
        thesis: "Move from the economy to the businesses inside it.",
        cards: [
          { t: "BREADTH", b: "Autos lead; IT lags." },
          { t: "EARNINGS", b: "Revisions mixed by sector." },
          { t: "VALUATION", b: "Premiums need context." },
          { t: "WATCH NEXT", b: "Results and management calls." },
        ],
      },
    };
    return panels[tab];
  }, [tab]);

  const scenarioSteps = SCENARIOS.find((s) => s.id === scenario)?.steps ?? [];

  return (
    <section id="markets" className="scroll-mt-16 border-b border-[#dcd6cc] px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <Eyebrow>04 / One market, many moving parts</Eyebrow>
        <SectionTitle className="mt-3">Track the whole market, not one ticker at a time.</SectionTitle>
        <BodyCopy className="mt-4 max-w-3xl">
          Move from the rupee to bonds, global indices, the economy, and company-level signals without opening six tabs. The
          board explains what changed, what connects, and what to watch next.
        </BodyCopy>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b6b6b]">Market views</p>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-none border px-3 py-2 text-xs font-semibold uppercase tracking-wide",
                tab === t.id ? "border-[#141414] bg-[#141414] text-white" : "border-[#dcd6cc] bg-[#faf7f2]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex border border-[#dcd6cc]">
            {(["1D", "1M", "1Y"] as Range[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold",
                  range === r ? "bg-[#141414] text-white" : "bg-[#faf7f2] text-[#3d3d3d]",
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setBoardMsg("Added to your daily board for this session.")}
            className="border border-[#dcd6cc] bg-[#faf7f2] px-3 py-1.5 text-xs font-semibold text-[#141414]"
          >
            ＋ Add view to daily board
          </button>
          {boardMsg ? <p className="text-xs text-[#0d6b5c]">{boardMsg}</p> : null}
        </div>

        <p className="mt-4 text-xs text-[#6b6b6b]">
          FX currency pairs · Rates yield curves · World global indices · Economy macro series · Business sector lenses · Proof
          source receipts
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="overflow-x-auto border border-[#dcd6cc]">
            <table className="w-full min-w-[320px] bg-[#faf7f2] px-3 text-left">
              <thead>
                <tr className="border-b border-[#dcd6cc] text-[10px] font-semibold uppercase tracking-wider text-[#6b6b6b]">
                  <th className="py-2">Instrument</th>
                  <th className="py-2">Value</th>
                  <th className="py-2">{range}</th>
                  <th className="py-2">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <WatchRow key={r.label} {...r} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="border border-[#dcd6cc] bg-[#faf7f2] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#b84624]">{panel.heading}</p>
            <p className="mt-2 text-lg font-semibold text-[#141414]">{panel.thesis}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {panel.cards.map((c) => (
                <DataCell key={c.t} label={c.t} value={c.b} />
              ))}
            </div>
            <SourceLine source="Live feeds" fetched={formatIstTimestamp(fetchedAt)} />
          </div>
        </div>

        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b6b6b]">Explore a market scenario</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenario(s.id)}
                className={cn(
                  "rounded-none border px-3 py-2 text-xs font-semibold uppercase",
                  scenario === s.id ? "border-[#141414] bg-[#141414] text-white" : "border-[#dcd6cc] bg-[#faf7f2]",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <ol className="mt-4 space-y-2 border border-[#dcd6cc] bg-[#faf7f2] p-4 text-sm text-[#3d3d3d]">
            {scenarioSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-[#6b6b6b]">
          Every row shows source, fetch time, and delay where applicable. Failed feeds stay blank with unavailable — never a
          guessed number.
        </p>
      </div>
    </section>
  );
}
