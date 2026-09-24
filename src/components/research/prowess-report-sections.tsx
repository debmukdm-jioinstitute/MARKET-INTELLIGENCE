"use client";

import { Panel } from "@/components/layout/page-header";
import type { ReportId } from "@/lib/prowess/reports";
import { ProwessPanel } from "@/components/research/prowess-panel";
import { useEffect, useState } from "react";

const REPORTS: { report: ReportId; title: string }[] = [
  { report: "financials", title: "Reported financials" },
  { report: "balance", title: "Balance sheet" },
  { report: "cashflow", title: "Cash flow" },
  { report: "returns", title: "Annual stock returns" },
  { report: "stock", title: "Stock prices & ratios" },
];

type Gate =
  | { state: "loading" }
  | { state: "blocked"; message: string }
  | { state: "ready" };

export function ProwessReportSections({ company }: { company: string }) {
  const [gate, setGate] = useState<Gate>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    setGate({ state: "loading" });
    fetch(`/api/prowess/company?company=${encodeURIComponent(company)}&report=financials`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.status === "ok") setGate({ state: "ready" });
        else if (j.status === "unavailable" || j.status === "not_configured") {
          setGate({
            state: "blocked",
            message:
              j.message ??
              (j.status === "not_configured"
                ? "CMIE Prowess is not configured on this server."
                : "Reported financials are unavailable."),
          });
        } else setGate({ state: "ready" });
      })
      .catch(() => !cancelled && setGate({ state: "ready" }));
    return () => {
      cancelled = true;
    };
  }, [company]);

  if (gate.state === "loading") {
    return (
      <Panel title="Reported financials (CMIE)" subtitle="Source: CMIE Prowess">
        <p className="text-sm text-muted-foreground">Loading reported financials…</p>
      </Panel>
    );
  }

  if (gate.state === "blocked") {
    return (
      <Panel title="Reported financials (CMIE)" subtitle="Source: CMIE Prowess">
        <p className="text-sm text-muted-foreground leading-relaxed">{gate.message}</p>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Use the Upstox fundamentals block above when available. For live CMIE data, set a valid{" "}
          <code className="text-xs">PROWESS_API_KEY</code> with an active API subscription from{" "}
          <a href="https://register.cmie.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            CMIE
          </a>
          .
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {REPORTS.map((r) => (
        <ProwessPanel key={r.report} company={company} report={r.report} title={r.title} />
      ))}
    </div>
  );
}
