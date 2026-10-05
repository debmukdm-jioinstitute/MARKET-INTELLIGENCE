"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { useLegalRiskHub } from "@/hooks/use-legal-risk-hub";
import type { CorporateRiskCase, ImpactLevel, LegalMonitor } from "@/lib/legal-risk/types";
import { cn } from "@/lib/utils";
import { ExternalLink, Gavel, RefreshCw, Scale, ShieldAlert } from "lucide-react";

function impactBadge(level: ImpactLevel) {
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
        level === "high" && "bg-rose-500/15 text-rose-700",
        level === "medium" && "bg-amber-500/15 text-amber-800",
        level === "low" && "bg-emerald-500/15 text-emerald-700",
        level === "unknown" && "bg-muted text-muted-foreground",
      )}
    >
      {level}
    </span>
  );
}

function RiskChain({ c }: { c: CorporateRiskCase }) {
  const rows: { label: string; value: string; href?: string }[] = [
    {
      label: "Company",
      value: c.company.symbol ? `${c.company.symbol} · ${c.company.name ?? ""}`.trim() : "Unmatched — open headline",
    },
    { label: "Legal case", value: c.legalCase },
    { label: "Regulator", value: c.regulator },
    { label: "Issue", value: c.issue },
    { label: "Financial exposure", value: c.financialExposure ?? "Not stated in headline" },
    { label: "Potential impact", value: c.potentialImpact },
  ];

  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="size-4 text-primary" />
          {impactBadge(c.potentialImpact)}
        </div>
        <a
          href={c.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Source <ExternalLink className="size-3" />
        </a>
      </div>
      <dl className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-1 sm:grid-cols-[9rem_1fr]">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{r.label}</dt>
            <dd className="text-sm text-foreground">
              {r.label === "Company" && c.company.symbol ? (
                <Link href={`/research?symbol=${c.company.symbol}`} className="font-semibold text-primary hover:underline">
                  {r.value}
                </Link>
              ) : (
                r.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      {c.publishedAt ? (
        <p className="mt-2 text-[11px] text-muted-foreground">Published: {c.publishedAt}</p>
      ) : null}
    </article>
  );
}

function MonitorRow({ m }: { m: LegalMonitor }) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-3 py-2.5 font-semibold text-foreground">{m.label}</td>
      <td className="px-3 py-2.5">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
            m.coverage === "live" && "bg-emerald-500/15 text-emerald-700",
            m.coverage === "partial" && "bg-amber-500/15 text-amber-800",
            m.coverage === "planned" && "bg-muted text-muted-foreground",
          )}
        >
          {m.coverage}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground">{m.summary}</td>
      <td className="px-3 py-2.5 tabular-nums text-sm">{m.recentCaseCount}</td>
      <td className="px-3 py-2.5">
        <a href={m.portalUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
          Portal
        </a>
      </td>
    </tr>
  );
}

export function LegalRiskDashboard() {
  const { data, loading, error, reload } = useLegalRiskHub();

  return (
    <div className="portal-page space-y-8 pb-12">
      <PageHeader
        titleAs="h1"

        title="Corporate risk monitor"
        subtitle="NCLT, courts, SEBI, CCI, ED, and RBI enforcement — mapped from live news feeds into company → case → regulator → exposure → impact."
        trust={{
          source: "NSE/BSE/RBI RSS + publisher feeds · official portal links",
          asOf: data?.fetchedAt,
          methodology:
            "Headline keyword classifier — not a court docket. Confirm orders on NCLT/SEBI/eCourts before decisions.",
        }}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => reload()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted/60"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {loading && !data ? <p className="text-sm text-muted-foreground">Scanning feeds…</p> : null}

      {data ? (
        <>
          <section className="rounded-xl border border-rose-500/25 bg-gradient-to-br from-rose-500/5 via-card to-card p-5">
            <div className="flex items-center gap-3">
              <ShieldAlert className="size-8 text-rose-600" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Corporate risk monitor</p>
                <p className="text-lg font-bold text-foreground">{data.corporateRiskMonitor.summary}</p>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {data.corporateRiskMonitor.activeCaseCount} cases · {data.corporateRiskMonitor.highImpactCount} high impact
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <Gavel className="size-4" />
              Risk chains
            </h2>
            {data.cases.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {data.cases.map((c) => (
                  <RiskChain key={c.id} c={c} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No matching headlines right now. Use regulator portals below or widen coverage when NCLT/SEBI crawls ship.
              </p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider">Regulator monitors</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 font-bold">Monitor</th>
                    <th className="px-3 py-2 font-bold">Coverage</th>
                    <th className="px-3 py-2 font-bold">Notes</th>
                    <th className="px-3 py-2 font-bold">Hits</th>
                    <th className="px-3 py-2 font-bold">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {data.monitors.map((m) => (
                    <MonitorRow key={m.id} m={m} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Official sources</p>
            <ul className="mt-2 space-y-1 text-sm">
              {data.sourceCatalog.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                    {s.label}
                  </a>
                  <span className="text-muted-foreground"> — {s.role}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
