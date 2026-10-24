"use client";

import { useState } from "react";
import type { TableOut } from "@/lib/indices/tipsheet-indices";
import { dmy } from "@/lib/format";
import { val } from "./tables";

const ink3 = { color: "var(--ink-3)" } as const;
const RED = "#b3312f";
const GREEN = "#17603a";
const tint = (v: number, sat: number) => ({ backgroundColor: v < 0 ? `rgba(192,73,65,${Math.min(-v / sat, 1) * 0.16 + 0.04})` : `rgba(34,139,84,${Math.min(v / sat, 1) * 0.16 + 0.04})` });
const LABEL: Record<string, string> = { "Held for": "Held for", "1 in 10 worse than": "Bottom 10%", "1 in 10 better than": "Top 10%", "Spans that lost": "Lost money", Middle: "Median" };

function Shell({ caption, children, min }: { caption?: string; children: React.ReactNode; min: string }) {
  return (
    <div>
      {caption ? <p className="mb-2 text-sm" style={ink3}>{dmy(caption)}</p> : null}
      <div className="overflow-x-auto rounded-md border" style={{ borderColor: "var(--rule)" }}>
        <table className={`w-full ${min} border-collapse text-sm tabular-nums sm:text-base`}>{children}</table>
      </div>
    </div>
  );
}

/** Holding-period outcomes: green and red cells by size, median in bold, share of spans that lost money. */
export function OutcomesTable({ t }: { t: TableOut }) {
  const lostCol = t.headers.findIndex((h) => h === "Spans that lost") - 1;
  const medCol = t.headers.findIndex((h) => h === "Middle") - 1;
  const returnCols = t.headers.map((_, i) => i - 1).filter((i) => i >= 0 && i < lostCol);
  const none = t.rows.filter((r) => lostCol >= 0 && val(r.cells[lostCol]) === 0).map((r) => r.label.replace(/ years?$/, ""));
  return (
    <div className="space-y-3">
      <Shell min="min-w-[720px]">
        <thead style={ink3}>
          <tr className="border-b" style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}>
            {t.headers.map((h, i) => <th key={i} scope="col" className={`whitespace-nowrap px-4 py-2.5 font-normal ${i === 0 ? "text-left" : "text-right"} ${i - 1 === medCol ? "font-semibold text-foreground" : ""}`}>{LABEL[h] ?? h}</th>)}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r) => (
            <tr key={r.label} className="border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
              <th scope="row" className="px-4 py-2.5 text-left font-normal">{r.label}</th>
              {r.cells.map((c, i) => {
                const v = val(c);
                const isRet = returnCols.includes(i);
                const isLost = i === lostCol;
                return (
                  <td key={i} className={`px-4 py-2.5 text-right ${i === medCol ? "font-semibold" : ""}`} style={isRet ? { ...tint(v, 40), color: v < 0 ? RED : undefined } : isLost ? { ...tint(v === 0 ? 1 : -v, 40), color: v === 0 ? GREEN : RED } : undefined}>{c.t}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </Shell>
      <p className="text-sm" style={ink3}>Bottom / top 10% show the 10th / 90th percentile thresholds. Periods overlap; separate spans indicate the limited non-overlapping history.</p>
      {none.length ? (
        <p className="flex items-start gap-2 rounded-md px-4 py-3 text-sm" style={{ background: "var(--paper-2)", color: "var(--ink-2)" }}>
          <span aria-hidden>ⓘ</span>
          No losses observed in {none.join("- or ")}-year spans in this sample. Longer periods have fewer independent observations.
        </p>
      ) : null}
    </div>
  );
}

/** Monthly SIP by start year, with the annual return (XIRR) shaded green or red. */
export function SipTable({ t }: { t: TableOut }) {
  const last = t.headers.length - 2;
  const [all, setAll] = useState(false);
  const rows = all ? t.rows : t.rows.slice(0, 5);
  const span = t.rows.length > 1 ? `${t.rows.at(-1)!.label}–${t.rows[0].label}` : "";
  return (
    <div className="space-y-3">
    <Shell caption={t.caption} min="min-w-[560px]">
      <thead style={ink3}>
        <tr className="border-b" style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}>
          {t.headers.map((h, i) => <th key={i} scope="col" className={`whitespace-nowrap px-4 py-2.5 font-normal ${i === 0 ? "text-left" : "text-right"}`}>{h.replace("Return a year (XIRR)", "Annual return (XIRR)")}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
            <th scope="row" className="px-4 py-2 text-left font-normal">{r.label}</th>
            {r.cells.map((c, i) => <td key={i} className="px-4 py-2 text-right" style={i === last ? { ...tint(val(c), 15), color: val(c) < 0 ? RED : undefined } : undefined}>{c.t}</td>)}
          </tr>
        ))}
      </tbody>
    </Shell>
    {t.rows.length > 5 ? <button type="button" onClick={() => setAll((v) => !v)} className="min-h-11 text-sm underline underline-offset-4 sm:min-h-9" style={{ color: "var(--focus)" }}>{all ? "Show recent starts only" : `View all start years, ${span} →`}</button> : null}
    </div>
  );
}
