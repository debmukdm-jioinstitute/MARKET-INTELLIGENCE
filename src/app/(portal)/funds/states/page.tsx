import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "State-wise Mutual Fund Penetration | Market Intelligence",
  description: "State-wise mutual fund AUM contribution and retail investor adoption across T30 and B30 cities.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Geographic Distribution</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        State-wise mutual fund AUM contribution and retail investor adoption across T30 and B30 cities.
      </p>
    </div>
  );
}
