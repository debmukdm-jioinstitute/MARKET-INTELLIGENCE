import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MTF Book & Liquidation | Market Intelligence",
  description: "Stock-level and market-wide margin trading facility (MTF) exposure and daily liquidations.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Margin Trading Facility (MTF)</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        Stock-level and market-wide margin trading facility (MTF) exposure and daily liquidations.
      </p>
    </div>
  );
}
