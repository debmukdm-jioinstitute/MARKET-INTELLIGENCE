import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leverage & Margin Trading | Market Intelligence",
  description: "System-wide margin trading facility (MTF) book size, daily fresh exposure, and leverage ratios sourced from NSE.",
};

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl space-y-2 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Leverage & Margin Trading</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>
        System-wide margin trading facility (MTF) book size, daily fresh exposure, and leverage ratios sourced from NSE.
      </p>
    </div>
  );
}
