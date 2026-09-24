"use client";

import { Panel } from "@/components/layout/page-header";
import type { ReportId } from "@/lib/prowess/reports";
import { useEffect, useState } from "react";

type ProwessTable = { meta?: unknown; head?: string[] | string[][]; data?: (string | number | null)[][] };
type Resp =
  | { status: "ok"; data: ProwessTable | ProwessTable[] }
  | { status: "not_configured" }
  | { status: "missing_batch"; batch: string }
  | { status: "error"; error: string };

/** JSON `head` is a list of header rows (label row, then unit row) — merge them per column. */
function headLabels(head: ProwessTable["head"]): string[] {
  if (!head?.length) return [];
  if (typeof head[0] === "string") return head as string[];
  const rows = head as string[][];
  return rows[0].map((_, i) => rows.map((r) => r[i]).filter(Boolean).join(" ").replace(/\\n|\n/g, " "));
}

/** CMIE Prowess report for a company (financials or stock prices/ratios). Data fetched server-side via /api/prowess/company. */
export function ProwessPanel({ company, report, title }: { company: string; report: ReportId; title: string }) {
  const [resp, setResp] = useState<Resp | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResp(null);
    fetch(`/api/prowess/company?company=${encodeURIComponent(company)}&report=${report}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => !cancelled && setResp(j.status ? j : { status: "error", error: j.error ?? "Failed" }))
      .catch((e) => !cancelled && setResp({ status: "error", error: String(e) }));
    return () => {
      cancelled = true;
    };
  }, [company, report]);

  const tables = resp?.status === "ok" ? (Array.isArray(resp.data) ? resp.data : [resp.data]) : [];

  return (
    <Panel title={title} subtitle="Source: CMIE Prowess">
      {!resp ? <p className="text-sm text-muted-foreground">Loading Prowess data…</p> : null}
      {resp?.status === "not_configured" ? <p className="text-sm text-muted-foreground">Prowess is not configured (PROWESS_API_KEY).</p> : null}
      {resp?.status === "missing_batch" ? (
        <p className="text-sm text-muted-foreground">Add the Prowess batch file <code>prowess-batches/{resp.batch}</code> to enable this panel.</p>
      ) : null}
      {resp?.status === "error" ? <p className="text-sm text-rose-600">{resp.error}</p> : null}
      {tables.map((t, i) => (
        <div key={i} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                {headLabels(t.head).map((h, j) => (
                  <th key={j} className="whitespace-pre-line px-2 py-1 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(t.data ?? []).slice(0, 200).map((row, r) => (
                <tr key={r} className="border-t border-border/50">
                  {row.map((c, j) => (
                    <td key={j} className="whitespace-nowrap px-2 py-1 tabular-nums">{c ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </Panel>
  );
}
