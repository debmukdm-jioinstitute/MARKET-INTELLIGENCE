"use client";

import { useMarketStatus } from "@/hooks/use-market-status";
import type { IndiaDashboardPayload } from "@/lib/feeds/india/types";
import { fiiDiiStance, formatIstTimestamp, liveFromQuote, vixRegime } from "@/lib/marketing/landing-v2/format";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useLandingDashboard } from "./use-landing-data";
import { BodyCopy, DataCell, PaperChart, PrimaryButton, SecondaryButton, SectionTitle, SourceLine } from "./ui";

type HeroView = "market" | "vix" | "flows";

const CHART_PATHS: Record<HeroView, string> = {
  market: "M 0 72 C 40 68, 60 78, 90 58 C 120 42, 140 48, 170 38 C 200 28, 220 34, 250 22 C 280 14, 310 26, 340 18 C 370 10, 390 16, 400 8",
  vix: "M 0 55 C 50 52, 80 60, 120 48 C 160 36, 190 44, 230 30 C 270 22, 300 38, 340 28 C 360 24, 380 32, 400 26",
  flows: "M 0 65 C 45 62, 70 70, 110 55 C 150 40, 180 52, 220 45 C 260 38, 290 48, 330 35 C 360 28, 385 42, 400 30",
};

export function LandingHeroSection() {
  const { dashboard } = useLandingDashboard();
  const { isOpen } = useMarketStatus();
  const [view, setView] = useState<HeroView>("market");
  const fetchedAt = dashboard?.fetchedAt ?? "";

  const nifty = liveFromQuote(dashboard?.pulse?.nifty, fetchedAt, { digits: 2 });
  const vix = liveFromQuote(dashboard?.pulse?.indiaVix, fetchedAt, { digits: 2 });
  const fiiToday = dashboard?.moneyFlow.fii.today ?? null;
  const diiToday = dashboard?.moneyFlow.dii.today ?? null;
  const flowSource = dashboard?.moneyFlow.fiiVsDii.source;
  const stance = fiiDiiStance(fiiToday, diiToday);
  const regime = vixRegime(dashboard?.pulse?.indiaVix?.value ?? null);

  const chartPath = useMemo(() => {
    const moving: IndiaDashboardPayload["indiaMoving"] | undefined =
      dashboard && "indiaMoving" in dashboard
        ? (dashboard as IndiaDashboardPayload).indiaMoving
        : undefined;
    const hist = view === "market" ? moving?.nifty?.history1m : undefined;
    if (view === "market" && hist && hist.length > 3) {
      const vals = hist.map((h: { value: number }) => h.value);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const span = max - min || 1;
      const pts = vals.map((v: number, i: number) => {
        const x = (i / (vals.length - 1)) * 400;
        const y = 75 - ((v - min) / span) * 65;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      });
      return pts.join(" ");
    }
    return CHART_PATHS[view];
  }, [dashboard, view]);

  const title =
    view === "market" ? "NIFTY 50 / MARKET VIEW" : view === "vix" ? "INDIA VIX / VOL VIEW" : "FII · DII / FLOWS VIEW";

  return (
    <section id="hero" className="scroll-mt-16 border-b border-[#dcd6cc] px-5 py-14 md:py-20">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-start">
        <div>
          <SectionTitle>
            See what the market is doing.
            <span className="block">Know where every number came from.</span>
          </SectionTitle>
          <BodyCopy className="mt-6">
            Indian stocks, currencies, bonds, global markets, macro, company fundamentals, and AI research briefs — connected
            in one view. In the live terminal, every figure is tagged with its source and fetch time.
          </BodyCopy>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryButton href="/signup">Start free</PrimaryButton>
            <SecondaryButton href="#proof">See a sample brief →</SecondaryButton>
          </div>
        </div>

        <div className="border border-[#dcd6cc] bg-[#faf7f2]">
          <div className="flex items-center justify-between border-b border-[#dcd6cc] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b6b6b]">Terminal preview</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6b6b]">{title}</p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-[#dcd6cc]">
            {(
              [
                ["market", "Index", nifty.display, nifty.changeDisplay ? `${nifty.changeDisplay} today` : ""] as const,
                ["vix", "India VIX", vix.display, regime] as const,
                ["flows", "FII / DII", stance || "—", "Cash market"] as const,
              ] as const
            ).map(([key, label, val, sub]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={cn(
                  "bg-[#faf7f2] px-3 py-4 text-left transition hover:bg-[#f0ebe3]",
                  view === key && "ring-1 ring-inset ring-[#c45c26]",
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6b6b]">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{val || "—"}</p>
                {sub ? <p className="mt-0.5 text-xs text-[#0d6b5c]">{sub}</p> : null}
              </button>
            ))}
          </div>
          <div className="relative h-44 border-t border-[#dcd6cc] sm:h-52">
            <PaperChart path={chartPath} />
          </div>
          <div className="space-y-1 border-t border-[#dcd6cc] px-4 py-3">
            <SourceLine source={nifty.source || vix.source} fetched={formatIstTimestamp(fetchedAt)} prefix="NSE ·" />
            {!isOpen && nifty.display ? (
              <p className="text-xs text-[#6b6b6b]">Market closed — showing last available close.</p>
            ) : null}
            {view === "flows" && flowSource?.provider ? (
              <SourceLine source={flowSource.provider} fetched={formatIstTimestamp(flowSource.asOf ?? fetchedAt)} />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
