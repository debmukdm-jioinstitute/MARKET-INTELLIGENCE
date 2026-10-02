"use client";

import { PROOF_BRIEF_BLOCKS, PROOF_TABS, type ProofSymbol } from "@/lib/marketing/landing-v2/copy";
import { formatIstTimestamp } from "@/lib/marketing/landing-v2/format";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { useLandingQuote } from "./use-landing-data";
import { BodyCopy, Eyebrow, SectionTitle, SourceLine } from "./ui";

export function LandingProofSection() {
  const [symbol, setSymbol] = useState<ProofSymbol>("RELIANCE");
  const { quote } = useLandingQuote(symbol);
  const blocks = PROOF_BRIEF_BLOCKS[symbol];

  const priceLine = useMemo(() => {
    if (!quote?.ltp) return null;
    const prev = quote.ohlc.close || quote.ltp - quote.netChange;
    const pct = prev ? (quote.netChange / prev) * 100 : null;
    const chStr = pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% today` : "";
    return { price: quote.ltp.toLocaleString("en-IN"), change: chStr, asOf: quote.asOf };
  }, [quote]);

  return (
    <section id="proof" className="scroll-mt-16 border-b border-[#dcd6cc] px-5 py-16">
      <div className="mx-auto max-w-6xl">
        <Eyebrow>01 / Proof before process</Eyebrow>
        <SectionTitle className="mt-3">Try it before you sign up.</SectionTitle>
        <BodyCopy className="mt-4 max-w-2xl">
          Choose a company. The brief changes with it, and every conclusion keeps its evidence attached.
        </BodyCopy>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b6b6b]">Choose a company</p>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Company brief">
          {PROOF_TABS.map((tab) => (
            <button
              key={tab.symbol}
              type="button"
              role="tab"
              aria-selected={symbol === tab.symbol}
              onClick={() => setSymbol(tab.symbol)}
              className={cn(
                "rounded-none border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide transition",
                symbol === tab.symbol
                  ? "border-[#141414] bg-[#141414] text-white"
                  : "border-[#dcd6cc] bg-[#faf7f2] text-[#3d3d3d] hover:border-[#141414]/40",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6 border border-[#dcd6cc] bg-[#faf7f2] p-5 md:p-8" role="tabpanel">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b84624]">One-page company brief</p>
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <h3 className="text-xl font-semibold text-[#141414]">{symbol}</h3>
            {priceLine ? (
              <>
                <span className="text-lg font-semibold tabular-nums">₹{priceLine.price}</span>
                {priceLine.change ? <span className="text-sm text-[#0d6b5c]">{priceLine.change}</span> : null}
                <SourceLine source="NSE / Upstox" fetched={formatIstTimestamp(priceLine.asOf)} />
              </>
            ) : (
              <p className="text-sm text-[#6b6b6b]">unavailable</p>
            )}
          </div>

          <div className="mt-8 space-y-6">
            {blocks.map((block) => (
              <div key={block.id}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b6b6b]">
                  {block.id} · {block.title}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#3d3d3d]">{block.body}</p>
                <p className="mt-2 text-xs text-[#6b6b6b]">Source: {block.source}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
