import type { Metadata } from "next";

export const metadata: Metadata = { title: "Valuation | Market Intelligence", description: "Index P/E and P/B against their usual range." };

export default function ValuationPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Valuation</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>Price-to-earnings and price-to-book for key NSE indices against the usual range of their own history.</p>
    </div>
  );
}
