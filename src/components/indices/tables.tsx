"use client";

import type { Cell, TableOut } from "@/lib/indices/tipsheet-indices";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const href = (slug: string) => `/markets/india/indices/${slug}`;
export const val = (c: Cell) => c.v ?? parseFloat(c.t.replace("−", "-").replace(/[^\d.\-]/g, ""));
const ink3 = { color: "var(--ink-3)" } as const;

/** Blue for gains, red for losses; opacity grows with size up to `sat`. */
export const heat = (v: number, sat: number) =>
  Number.isFinite(v) ? { backgroundColor: v >= 0 ? `rgba(37,99,235,${Math.min(v / sat, 1) * 0.4})` : `rgba(220,38,38,${Math.min(-v / sat, 1) * 0.4})` } : undefined;

function Wrap({ caption, children }: { caption?: string; children: React.ReactNode }) {
  return (
    <div>
      {caption ? <p className="mb-2 text-sm" style={ink3}>{caption}</p> : null}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--rule)" }}>{children}</div>
    </div>
  );
}

const th = "whitespace-nowrap px-3 py-2 font-medium";

/** Plain data table: first column left, the rest right-aligned; index names link to their pages. */
export function SimpleTable({ t }: { t: TableOut }) {
  return (
    <Wrap caption={t.caption}>
      <table className="w-full min-w-[480px] border-collapse text-sm tabular-nums">
        <thead style={ink3}>
          <tr className="border-b" style={{ borderColor: "var(--rule)" }}>
            {t.headers.map((h, i) => <th key={i} scope="col" className={cn(th, i === 0 ? "text-left" : "text-right")}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, ri) => (
            <tr key={ri} className="border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
              <th scope="row" className="sticky left-0 bg-card px-3 py-2 text-left font-normal">
                {r.href ? <Link href={href(r.href.split("/")[2])} className="underline decoration-border underline-offset-4">{r.label}</Link> : r.label}
              </th>
              {r.cells.map((c, i) => <td key={i} className="px-3 py-2 text-right">{c.t}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Wrap>
  );
}

/** Period grid shaded by value (calendar years, falls within a year, months). */
export function HeatTable({ t, sat, oldestFirst }: { t: TableOut; sat: number; oldestFirst: boolean }) {
  const idx = t.headers.map((_, i) => i).slice(1);
  const order = oldestFirst ? [...idx].reverse() : idx;
  return (
    <Wrap>
      <table className="w-full min-w-[640px] border-collapse text-xs tabular-nums sm:text-sm">
        <thead style={ink3}>
          <tr className="border-b" style={{ borderColor: "var(--rule)" }}>
            <th className={cn(th, "sticky left-0 bg-card text-left")} />
            {order.map((i) => <th key={i} scope="col" className={cn(th, "text-right")}>{t.headers[i]}</th>)}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, ri) => (
            <tr key={ri} className="border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
              <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-1.5 text-left font-normal">
                {r.href ? <Link href={href(r.href.split("/")[2])} className="underline decoration-border underline-offset-4">{r.label}</Link> : r.label}
              </th>
              {order.map((i) => {
                const c = r.cells[i - 1];
                return <td key={i} style={c ? heat(val(c), sat) : undefined} className="px-2 py-1.5 text-right">{c?.t ?? ""}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Wrap>
  );
}
