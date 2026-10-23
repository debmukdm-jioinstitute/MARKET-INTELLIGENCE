import type { Metadata } from "next";
import { TsStatusTable } from "@/components/ts-charts/ts-status-badge";

export const metadata: Metadata = { title: "Data status | Market Intelligence", description: "Freshness of every ingested dataset." };

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dataset status</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>Current means the latest observation is within the dataset&apos;s expected publication lag. Behind or failing datasets show &quot;source unavailable&quot; on charts, never filled-in values.</p>
      <TsStatusTable />
    </div>
  );
}
