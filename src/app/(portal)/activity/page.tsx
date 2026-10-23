import type { Metadata } from "next";

export const metadata: Metadata = { title: "Market activity | Market Intelligence", description: "Cash turnover and derivatives positioning." };

export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Market activity</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>Daily cash turnover and who holds index futures. Charts build from NSE files as they are ingested.</p>
    </div>
  );
}
