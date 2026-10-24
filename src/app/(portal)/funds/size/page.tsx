import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mutual Fund Scheme Size & AUM | Market Intelligence",
  description: "Average scheme size, category concentration, and industry asset scale.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Scheme Size & AUM</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        Average scheme size, category concentration, and industry asset scale.
      </p>
    </div>
  );
}
