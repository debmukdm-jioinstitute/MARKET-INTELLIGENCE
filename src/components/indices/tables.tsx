"use client";

import type { Cell, TableOut } from "@/lib/indices/tipsheet-indices";
import { dmy } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const href = (slug: string) => `/markets/india/indices/${slug}`;
/** Index page for a table row: its own link, else a lookup of the label in the index list. */
const slugFor = (r: { label: string; href?: string }, slugs?: Record<string, string>) => r.href?.split("/")[2] ?? slugs?.[r.label];

export const val = (c: Cell) => c.v ?? parseFloat(c.t.replace("−", "-").replace(/[^\d.\-]/g, ""));
const ink3 = { color: "var(--ink-3)" } as const;

/** Blue for gains, red for losses; opacity grows with size up to `sat`. */
export const heat = (v: number, sat: number) =>
  Number.isFinite(v) ? { backgroundColor: v >= 0 ? `rgba(37,99,235,${Math.min(v / sat, 1) * 0.4})` : `rgba(220,38,38,${Math.min(-v / sat, 1) * 0.4})` } : undefined;

function Wrap({ caption, children }: { caption?: string; children: React.ReactNode }) {
  return (
    <div>
      {caption ? <p className="mb-2 text-sm" style={ink3}>{dmy(caption)}</p> : null}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--rule)" }}>{children}</div>
    </div>
  );
}

const th = "whitespace-nowrap px-3 py-2 font-medium";

/** Plain data table: first column left, the rest right-aligned; index names link to their pages. */
export function SimpleTable({ t, slugs }: { t: TableOut; slugs?: Record<string, string> }) {
  return (
    <Wrap caption={t.caption}>
      <table className="w-full min-w-[480px] border-collapse text-sm tabular-nums">
        <thead style={ink3}>
          <tr className="border-b" style={{ borderColor: "var(--rule)" }}>
            {t.headers.map((h, i) => <th key={i} scope="col" className={cn(th, i === 0 ? "text-left" : "text-right")}>{dmy(h)}</th>)}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, ri) => (
            <tr key={ri} className="border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
              <th scope="row" className="sticky left-0 bg-card px-3 py-2 text-left font-normal">
                {slugFor(r, slugs) ? <Link href={href(slugFor(r, slugs)!)} className="underline decoration-border underline-offset-4">{r.label}</Link> : dmy(r.label)}
              </th>
              {r.cells.map((c, i) => <td key={i} className="px-3 py-2 text-right">{dmy(c.t)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Wrap>
  );
}

/** Period grid shaded by value (calendar years, falls within a year, months). */
export function HeatTable({ t, sat, oldestFirst, slugs }: { t: TableOut; sat: number; oldestFirst: boolean; slugs?: Record<string, string> }) {
  const idx = t.headers.map((_, i) => i).slice(1);
  const order = oldestFirst ? [...idx].reverse() : idx;
  return (
    <Wrap>
      <table className="w-full min-w-[640px] border-collapse text-xs tabular-nums sm:text-sm">
        <thead style={ink3}>
          <tr className="border-b" style={{ borderColor: "var(--rule)" }}>
            <th className={cn(th, "sticky left-0 bg-card text-left")} />
            {order.map((i) => <th key={i} scope="col" className={cn(th, "text-right")}>{dmy(t.headers[i])}</th>)}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, ri) => (
            <tr key={ri} className="border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
              <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-1.5 text-left font-normal">
                {slugFor(r, slugs) ? <Link href={href(slugFor(r, slugs)!)} className="underline decoration-border underline-offset-4">{r.label}</Link> : r.label}
              </th>
              {order.map((i) => {
                const c = r.cells[i - 1];
                return <td key={i} style={c ? heat(val(c), sat) : undefined} className="px-2 py-1.5 text-right">{dmy(c?.t ?? "")}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Wrap>
  );
}
