import type { Metadata } from "next";
import Link from "next/link";
import { INDICATORS } from "@/lib/ts-charts/registry";

export const metadata: Metadata = { title: "Indicators | Market Intelligence", description: "Long-history indicators with their usual range." };

export default function IndicatorsIndex() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-1 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">Indicators</h1>
      <p className="text-sm" style={{ color: "var(--ink-3)" }}>Each indicator shows its full stored history against the usual (10th to 90th percentile) range. No data is filled in where a source is unavailable.</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {INDICATORS.map((c) => (
          <li key={c.id}>
            <Link href={`/indicators/${c.id.slice(2)}`} className="flex min-h-11 flex-col rounded border px-3 py-2" style={{ borderColor: "var(--rule)" }}>
              <span className="font-medium">{c.title}</span>
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>{c.source}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
