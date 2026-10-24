import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Fear & Greed Index | Market Intelligence",
  description: "Indian stock market sentiment indicator combining breadth, momentum, VIX, PCR, and FII flows.",
  path: "/fear-and-greed",
});

const FACTORS = [
  { name: "Market Breadth", desc: "Share of advancing stocks vs declining stocks across NSE EQ series." },
  { name: "Price Momentum", desc: "Nifty 50 20-day return relative to its historical 1-year trend." },
  { name: "Market Volatility", desc: "Volatility index (VIX) inverted: high fear when spiked, complacency when suppressed." },
  { name: "Derivatives Sentiment", desc: "NSE Put-Call Ratio (PCR): options positioning across index contracts." },
  { name: "Institutional Flows", desc: "Foreign Portfolio Investor (FII/FPI) rolling net cash purchases." },
];

export default function FearAndGreedPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-1 py-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Market Fear & Greed Index</h1>
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          A transparent, equal-weighted composite of 5 objective market indicators. High readings indicate excessive optimism (greed); low readings signal widespread risk aversion (fear).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {FACTORS.map((f) => (
          <div key={f.name} className="rounded-lg border p-3.5 space-y-1" style={{ borderColor: "var(--rule)", background: "var(--paper)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink)" }}>{f.name}</h2>
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>{f.desc}</p>
          </div>
        ))}
        <div className="rounded-lg border p-3.5 space-y-1 flex flex-col justify-center" style={{ borderColor: "var(--rule)", background: "var(--paper)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink)" }}>Methodology</h2>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            Read the mathematical model, factor weights, and z-score bounds in the <Link href="/methodology" className="underline font-medium text-primary">methodology documentation</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
