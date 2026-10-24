import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SIP Accounts & Investor Ownership | Market Intelligence",
  description: "Total contributing SIP accounts, investor folios, and systematic investment plan stoppage ratios.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">SIP Accounts & Ownership</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        Total contributing SIP accounts, investor folios, and systematic investment plan stoppage ratios.
      </p>
    </div>
  );
}
