"use client";

import { DataInfo } from "@/components/feeds/data-info";
import { SourceLink } from "@/components/dashboard/source-link";
import { IvSmileChart, OiByStrikeChart } from "@/components/derivatives/greeks-charts";
import { OptionChainControls } from "@/components/derivatives/option-chain-controls";
import { OptionChainTable } from "@/components/derivatives/option-chain-table";
import { PageHeader, Panel } from "@/components/layout/page-header";
import { MetricInfo } from "@/components/ui/metric-info";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { useOptionChain, useOptionExpiries } from "@/hooks/use-option-chain";
import { INDIA_INDEX_INSTRUMENT_KEYS } from "@/lib/feeds/india/instruments";
import type { FoSnapshot } from "@/lib/feeds/india/types";
import { fmtNum } from "@/lib/format-india";
import Link from "next/link";
import { useState } from "react";

export default function DerivativesPage() {
  const [underlyingKey, setUnderlyingKey] = useState<string>(INDIA_INDEX_INSTRUMENT_KEYS.NIFTY);
  const { expiries, expiry, setExpiry, loading: expiriesLoading } = useOptionExpiries(underlyingKey);
  const { data: snapshot, loading, error } = useOptionChain(underlyingKey, expiry);

  const { data: legacy } = useIndiaDashboard(55_000);
  const fo = legacy?.indiaMoving.fo;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="F&O"
        title="Derivatives dashboard"
        subtitle="Option chain with live Greeks (Upstox) — delta, gamma, theta, vega, IV, PCR, and max pain, across Nifty, Bank Nifty, Fin Nifty, and individual F&O stocks."
      />
      <Link href="/Home" className="text-sm text-primary hover:underline">
        ← Back to dashboard
      </Link>

      <Panel
        title="Option chain"
        subtitle={
          <OptionChainControls
            underlyingKey={underlyingKey}
            onUnderlyingChange={(k) => {
              setUnderlyingKey(k);
              setExpiry("");
            }}
            expiry={expiry}
            expiries={expiries}
            onExpiryChange={setExpiry}
            expiriesLoading={expiriesLoading}
          />
        }
      >
        {loading && !snapshot ? <p className="text-sm text-muted-foreground">Loading chain…</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {snapshot ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <Metric metricId="nifty50" label="Spot" value={fmtNum(snapshot.underlyingSpot)} />
              <Metric metricId="pcr" label="PCR" value={snapshot.pcr != null ? snapshot.pcr.toFixed(3) : "—"} />
              <Metric metricId="max_pain" label="Max pain" value={snapshot.maxPain != null ? fmtNum(snapshot.maxPain, 0) : "—"} />
              <Metric metricId="pcr" label="Call OI" value={snapshot.totalCallOi?.toLocaleString("en-IN") ?? "—"} />
              <Metric metricId="pcr" label="Put OI" value={snapshot.totalPutOi?.toLocaleString("en-IN") ?? "—"} />
              <DataInfo source={snapshot.source} />
            </div>

            <OptionChainTable snapshot={snapshot} />

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase text-muted-foreground flex items-center gap-1">
                  IV smile
                  <MetricInfo id="vix" name="Implied Volatility Smile" iconSize="xs" />
                </p>
                <div className="h-[220px]">
                  <IvSmileChart snapshot={snapshot} />
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold uppercase text-muted-foreground flex items-center gap-1">
                  Open interest by strike
                  <MetricInfo id="pcr" name="Open Interest Distribution" iconSize="xs" />
                </p>
                <div className="h-[220px]">
                  <OiByStrikeChart snapshot={snapshot} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Panel>

      {fo ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <FoPanel title="NIFTY (NSE reference)" snap={fo.nifty} />
          <FoPanel title="BANK NIFTY (NSE reference)" snap={fo.bankNifty} />
        </div>
      ) : null}
    </div>
  );
}

function Metric({ metricId, label, value }: { metricId?: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-bold">{value}</span>
      {metricId ? <MetricInfo id={metricId} name={label} iconSize="xs" /> : null}
    </div>
  );
}

function FoPanel({ title, snap }: { title: string; snap: FoSnapshot }) {
  return (
    <Panel title={title} subtitle="NSE option chain indices API">
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Row metricId="pcr" k="PCR" v={snap.pcr != null ? snap.pcr.toFixed(3) : "—"} />
        <Row metricId="pcr" k="Total OI" v={snap.totalOi?.toLocaleString("en-IN") ?? "—"} />
        <Row metricId="pcr" k="Change in OI" v={snap.changeOi?.toLocaleString("en-IN") ?? "—"} />
        <Row metricId="pcr" k="Call OI" v={snap.callOi?.toLocaleString("en-IN") ?? "—"} />
        <Row metricId="pcr" k="Put OI" v={snap.putOi?.toLocaleString("en-IN") ?? "—"} />
        <Row metricId="max_pain" k="Max pain" v={snap.maxPain != null ? fmtNum(snap.maxPain, 0) : "—"} />
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
      <p className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-1">
        {label}
        <MetricInfo id="pcr" name={label} iconSize="xs" />
      </p>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1">Strike</th>
            <th className="py-1 text-right">OI</th>
          </tr>
        </thead>
        <tbody className="">
          {rows.length ? (
            rows.map((r) => (
              <tr key={r.strike} className="border-t border-border">
                <td className="py-1">{r.strike}</td>
                <td className="py-1 text-right">{r.oi.toLocaleString("en-IN")}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={2} className="py-2 text-muted-foreground">
                No chain data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Row({ metricId, k, v }: { metricId?: string; k: string; v: string }) {
  return (
    <div className="flex justify-between items-center border-b border-border/50 py-1">
      <dt className="text-muted-foreground flex items-center gap-1">
        <span>{k}</span>
        {metricId ? <MetricInfo id={metricId} name={k} iconSize="xs" /> : null}
      </dt>
      <dd>{v}</dd>
    </div>
  );
}
