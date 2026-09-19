"use client";

import { SourceLink } from "@/components/dashboard/source-link";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import type { FoSnapshot } from "@/lib/feeds/india/types";
import { fmtNum } from "@/lib/format-india";
import Link from "next/link";

export default function DerivativesPage() {
  const { data, loading, error } = useIndiaDashboard(55_000);
  const fo = data?.indiaMoving.fo;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="F&O"
        title="Derivatives dashboard"
        subtitle="NSE index option chain analytics — PCR, open interest, max pain, and strike concentration."
      />
      <Link href="/dashboard" className="text-xs text-primary hover:underline">← Back to dashboard</Link>
      {loading && !data ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {fo ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <FoPanel title="NIFTY" snap={fo.nifty} />
          <FoPanel title="BANK NIFTY" snap={fo.bankNifty} />
        </div>
      ) : null}
    </div>
  );
}

function FoPanel({ title, snap }: { title: string; snap: FoSnapshot }) {
  return (
    <Panel title={title} subtitle="NSE option chain indices API">
      <dl className="grid grid-cols-2 gap-2 font-mono text-sm">
        <Row k="PCR" v={snap.pcr != null ? snap.pcr.toFixed(3) : "—"} />
        <Row k="Total OI" v={snap.totalOi?.toLocaleString("en-IN") ?? "—"} />
        <Row k="Change in OI" v={snap.changeOi?.toLocaleString("en-IN") ?? "—"} />
        <Row k="Call OI" v={snap.callOi?.toLocaleString("en-IN") ?? "—"} />
        <Row k="Put OI" v={snap.putOi?.toLocaleString("en-IN") ?? "—"} />
        <Row k="Max pain" v={snap.maxPain != null ? fmtNum(snap.maxPain, 0) : "—"} />
      </dl>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <StrikeTable label="Call OI concentration" rows={snap.topCallStrikes} />
        <StrikeTable label="Put OI concentration" rows={snap.topPutStrikes} />
      </div>
      <SourceLink source={snap.source} className="mt-4 inline-block" />
    </Panel>
  );
}

function StrikeTable({ label, rows }: { label: string; rows: { strike: number; oi: number }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1">Strike</th>
            <th className="py-1 text-right">OI</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.length ? rows.map((r) => (
            <tr key={r.strike} className="border-t border-border">
              <td className="py-1">{r.strike}</td>
              <td className="py-1 text-right">{r.oi.toLocaleString("en-IN")}</td>
            </tr>
          )) : (
            <tr><td colSpan={2} className="py-2 text-muted-foreground">No chain data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
