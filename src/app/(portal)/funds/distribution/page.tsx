import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NFO Collections & Distribution | Market Intelligence",
  description: "New fund offerings (NFO) mobilized, scheme launches, and industry distribution footprint.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">NFO & Distribution</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        New fund offerings (NFO) mobilized, scheme launches, and industry distribution footprint.
      </p>
    </div>
  );
}
