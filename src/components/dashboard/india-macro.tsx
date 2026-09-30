"use client";

import { Panel } from "@/components/layout/page-header";
import { MetricInfo } from "@/components/ui/metric-info";
import type { IndiaDashboardPayload, MacroRow } from "@/lib/feeds/india/types";
import { fmtNum } from "@/lib/format-india";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

function fmtVintage(asOf?: string) {
  if (!asOf) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(asOf)) return asOf.slice(0, 10);
  if (/^\d{4}-\d{2}$/.test(asOf)) return asOf;
  if (/^\d{4}$/.test(asOf)) return asOf;
  return asOf.length > 12 ? asOf.slice(0, 10) : asOf;
}

function splitUnit(unit: string) {
  const trimmed = unit.trim();
  if (!trimmed) return { short: "", hint: "" };
  const paren = trimmed.indexOf("(");
  if (paren === -1) return { short: trimmed, hint: "" };
  return { short: trimmed.slice(0, paren).trim(), hint: trimmed.slice(paren).trim() };
}

function MacroValueCell({ value, unit }: { value: number | null; unit: string }) {
  const { short, hint } = splitUnit(unit);
  if (value == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="tabular-nums text-[15px] font-semibold leading-none text-foreground">{fmtNum(value)}</span>
      {short ? (
        <span className="text-[11px] font-medium leading-tight text-muted-foreground">{short}</span>
      ) : null}
      {hint ? <span className="max-w-[9rem] text-right text-[10px] leading-tight text-muted-foreground/80">{hint}</span> : null}
    </div>
  );
}

function DirectionBadge({ direction, delta }: { direction: MacroRow["direction"]; delta: number | null }) {
  if (direction === "na" || direction === "flat") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/40 px-2 py-1 text-xs font-semibold text-muted-foreground">
        <span aria-hidden>→</span>
        <span className="tabular-nums">{delta != null && Math.abs(delta) >= 0.005 ? fmtNum(delta, 2) : "Flat"}</span>
      </span>
    );
  }
  const up = direction === "up";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold tabular-nums",
        up
          ? "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
      )}
    >
      <span aria-hidden>{up ? "↑" : "↓"}</span>
      {delta != null ? fmtNum(Math.abs(delta), 2) : up ? "Up" : "Down"}
    </span>
  );
}

function MacroSparkline({
  points,
  indicator,
  rowId,
}: {
  points: MacroRow["history12m"];
  indicator: string;
  rowId: string;
}) {
  const chart = points.map((p) => ({ v: p.value }));
  if (chart.length < 2) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const first = points[0]?.value ?? 0;
  const last = points[points.length - 1]?.value ?? 0;
  const up = last >= first;
  const stroke = up ? "#1a73e8" : "#d93025";
  const fillId = `macro-spark-${rowId.replace(/\W+/g, "-")}`;

  return (
    <div
      className="h-10 w-full min-w-[96px] max-w-[128px] rounded-md border border-border/50 bg-gradient-to-b from-muted/20 to-transparent px-1 py-0.5"
      role="img"
      aria-label={`12 month trend for ${indicator}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chart} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={1.6}
            fill={`url(#${fillId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MacroTableRow({ row, hubSyncedAt }: { row: MacroRow; hubSyncedAt: string }) {
  const delta =
    row.current != null && row.previous != null && Number.isFinite(row.current - row.previous)
      ? row.current - row.previous
      : null;
  const vintage = fmtVintage(row.source.asOf ?? row.history12m[row.history12m.length - 1]?.date);

  return (
    <tr className="group border-b border-border/50 transition-colors hover:bg-accent/20">
      <td className="py-3.5 pr-3 align-top">
        <div className="flex min-w-0 items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold leading-snug text-foreground">{row.indicator}</span>
              <MetricInfo
                id={row.id}
                name={row.indicator}
                provider={row.source.provider}
                sourceUrl={row.source.url}
                asOf={row.source.asOf ?? hubSyncedAt}
                iconSize="xs"
              />
            </div>
            {vintage ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                As of <span className="tabular-nums">{vintage}</span>
              </p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="hidden py-3.5 pr-3 align-middle sm:table-cell">
        <MacroValueCell value={row.current} unit={row.unit} />
      </td>
      <td className="hidden py-3.5 pr-3 align-middle md:table-cell">
        <MacroValueCell value={row.previous} unit={row.unit} />
      </td>
      <td className="py-3.5 pr-3 align-middle">
        <DirectionBadge direction={row.direction} delta={delta} />
      </td>
      <td className="hidden py-3.5 align-middle md:table-cell">
        <MacroSparkline points={row.history12m} indicator={row.indicator} rowId={row.id} />
      </td>
      <td className="py-3.5 align-top sm:hidden">
        <div className="space-y-2 rounded-lg border border-border/60 bg-card/50 p-2.5">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Current</span>
            <MacroValueCell value={row.current} unit={row.unit} />
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-border/40 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Previous</span>
            <MacroValueCell value={row.previous} unit={row.unit} />
          </div>
          <div className="border-t border-border/40 pt-2 md:hidden">
            <MacroSparkline points={row.history12m} indicator={row.indicator} rowId={row.id} />
          </div>
        </div>
      </td>
    </tr>
  );
}

export function IndiaMacro({ data }: { data: IndiaDashboardPayload }) {
  return (
    <Panel
      id="india-macro-table"
      title="India macro"
      subtitle="Current · previous · 12M trend (official / open data only)."
      className="mt-6"
    >
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[520px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[38%]" />
            <col className="hidden w-[14%] sm:table-column" />
            <col className="hidden w-[14%] md:table-column" />
            <col className="w-[14%]" />
            <col className="hidden w-[20%] md:table-column" />
            <col className="w-auto sm:hidden" />
          </colgroup>
          <thead>
            <tr className="border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="py-2.5 pr-3 font-bold">Indicator</th>
              <th className="hidden py-2.5 pr-3 text-right font-bold sm:table-cell">Current</th>
              <th className="hidden py-2.5 pr-3 text-right font-bold md:table-cell">Previous</th>
              <th className="py-2.5 pr-3 font-bold">Change</th>
              <th className="hidden py-2.5 font-bold md:table-cell">12M trend</th>
              <th className="py-2.5 font-bold sm:hidden">Values</th>
            </tr>
          </thead>
          <tbody>
            {data.indiaMacro.map((row) => (
              <MacroTableRow key={row.id} row={row} hubSyncedAt={data.fetchedAt} />
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
