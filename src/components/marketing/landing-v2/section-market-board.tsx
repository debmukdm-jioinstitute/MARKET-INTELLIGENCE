"use client";

import { formatIstTimestamp } from "@/lib/marketing/landing-v2/format";
import {
  buildMarketPanel,
  buildScenarioSteps,
  panelCardsOrPlaceholders,
} from "@/lib/marketing/landing-v2/live-narratives";
import {
  buildMarketBoardRows,
  type MarketTab,
  type Range,
} from "@/lib/marketing/landing-v2/market-board-rows";
import { liveFromQuote } from "@/lib/marketing/landing-v2/format";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useLandingDashboard } from "./use-landing-data";
import { BodyCopy, DataCell, SectionTitle, SourceLine } from "./ui";
import { landingSignClass } from "@/lib/sign-color";

type Scenario = "risk-on" | "inflation" | "rupee";

const TABS: { id: MarketTab; label: string }[] = [
  { id: "all", label: "All markets" },
  { id: "currencies", label: "Currencies" },
  { id: "bonds", label: "Bonds" },
  { id: "global", label: "Global" },
  { id: "macro", label: "Macro" },
  { id: "micro", label: "Micro" },
];

const SCENARIO_LABELS: { id: Scenario; label: string }[] = [
  { id: "risk-on", label: "Risk-on" },
  { id: "inflation", label: "Inflation shock" },
  { id: "rupee", label: "Weak rupee" },
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
      <td className={cn("py-2 pr-4 text-sm tabular-nums", landingSignClass(change))}>{change || "—"}</td>
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

export function LandingMarketBoardSection() {
  const { dashboard, loading, error } = useLandingDashboard();
  const [tab, setTab] = useState<MarketTab>("all");
  const [range, setRange] = useState<Range>("1D");
  const [scenario, setScenario] = useState<Scenario>("risk-on");
  const [boardMsg, setBoardMsg] = useState("");

  const fetchedAt = dashboard?.fetchedAt ?? "";

  const rows = useMemo(() => buildMarketBoardRows(tab, range, dashboard), [tab, range, dashboard]);

  const panel = useMemo(() => {
    const built = buildMarketPanel(tab, dashboard);
    return { ...built, cards: panelCardsOrPlaceholders(built.cards) };
  }, [tab, dashboard]);

  const panelSource = useMemo(() => {
    const n = liveFromQuote(dashboard?.pulse?.nifty, fetchedAt);
    return n.source || "Live feeds";
  }, [dashboard, fetchedAt]);

  const scenarioSteps = useMemo(() => buildScenarioSteps(scenario, dashboard), [scenario, dashboard]);

  return (
    <section id="markets" className="scroll-mt-16 border-b border-[#dcd6cc] px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <SectionTitle>Track the whole market, not one ticker at a time.</SectionTitle>
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
                {loading && !rows.some((r) => r.value) ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-[#6b6b6b]">
                      Loading market feeds…
                    </td>
                  </tr>
                ) : null}
                {rows.map((r) => (
                  <WatchRow key={`${tab}-${r.label}`} {...r} />
                ))}
                {error && !dashboard ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-sm text-[#9b2c2c]">
                      Feeds unavailable — refresh the page.
                    </td>
                  </tr>
                ) : null}
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
            <SourceLine source={panelSource} fetched={formatIstTimestamp(fetchedAt)} />
          </div>
        </div>

        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b6b6b]">Explore a market scenario</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SCENARIO_LABELS.map((s) => (
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
