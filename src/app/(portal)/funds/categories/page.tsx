import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fund Categories & Asset Classes | Market Intelligence",
  description: "AUM and net flow breakdown across Equity, Debt, Hybrid and Passive index funds.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Fund Categories</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        AUM and net flow breakdown across Equity, Debt, Hybrid and Passive index funds.
      </p>
    </div>
  );
}
