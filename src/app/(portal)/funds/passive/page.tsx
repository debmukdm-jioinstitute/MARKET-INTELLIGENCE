import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Passive & Index Funds | Market Intelligence",
  description: "Passive AUM growth, index tracking performance, and exchange-traded fund expansion.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Passive & Index Funds</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        Passive AUM growth, index tracking performance, and exchange-traded fund expansion.
      </p>
    </div>
  );
}
