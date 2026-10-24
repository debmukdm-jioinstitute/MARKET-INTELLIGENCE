import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ETF Intelligence & Premium/Discount | Market Intelligence",
  description: "Live market price vs AMFI NAV spread, daily traded turnover, and tracking differentials for top Indian benchmark ETFs.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Exchange Traded Funds (ETFs)</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        Live market price vs AMFI NAV spread, daily traded turnover, and tracking differentials for top Indian benchmark ETFs.
      </p>
    </div>
  );
}
