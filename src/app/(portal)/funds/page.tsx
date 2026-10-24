import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mutual Funds Intelligence | Market Intelligence",
  description: "Monthly SIP contributions, industry AUM trends, category inflows and net asset movements sourced directly from AMFI.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Mutual Funds</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        Monthly SIP contributions, industry AUM trends, category inflows and net asset movements sourced directly from AMFI.
      </p>
    </div>
  );
}
