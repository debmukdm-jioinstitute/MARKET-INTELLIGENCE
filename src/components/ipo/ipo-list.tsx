"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricInfo } from "@/components/ui/metric-info";
import { formatIpoBidWindow } from "@/lib/feeds/ipo/format-dates";
import type { IpoListing } from "@/lib/feeds/ipo/types";
import { fmtInr } from "@/lib/format-india";

function formatGmp(ipo: IpoListing): string {
  if (ipo.gmpInr == null) return "Grey market premium —";
  const sign = ipo.gmpInr > 0 ? "+" : "";
  const pct = ipo.gmpPct != null ? ` (${sign}${ipo.gmpPct}%)` : "";
  return `Grey market premium ${sign}${fmtInr(ipo.gmpInr)}${pct}`;
}

export function IpoList({
  ipos,
  loading,
  onSelect,
}: {
  ipos: IpoListing[];
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading && !ipos.length) {
    return <p className="text-sm text-muted-foreground">Loading IPOs…</p>;
  }
  if (!ipos.length) {
    return <p className="text-sm text-muted-foreground">No IPOs in this category right now.</p>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {ipos.map((ipo) => (
        <Card
          key={ipo.id}
          className="cursor-pointer space-y-2 p-4 hover:border-primary/50"
          onClick={() => onSelect(ipo.id)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1">
              <p className="font-semibold leading-tight">{ipo.name}</p>
              <MetricInfo id="ipo_subscription" name={`${ipo.name} IPO`} iconSize="xs" />
            </div>
            <Badge variant="outline" className="shrink-0 uppercase">
              {ipo.issueType}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{ipo.industry}</p>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span>{fmtInr(ipo.minPrice)}–{fmtInr(ipo.maxPrice)}</span>
            <span className="text-right text-muted-foreground">
              {formatIpoBidWindow(ipo.biddingStartDate, ipo.biddingEndDate)}
            </span>
          </div>
          <p className="flex items-center gap-1 text-sm tabular-nums text-foreground">
            <span className={ipo.gmpInr != null && ipo.gmpInr > 0 ? "text-emerald-700" : ipo.gmpInr != null && ipo.gmpInr < 0 ? "text-rose-700" : "text-muted-foreground"}>
              {formatGmp(ipo)}
            </span>
            <MetricInfo id="ipo_gmp" name="Grey Market Premium" iconSize="xs" />
          </p>
          {ipo.totalSubscription ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <span>Subscribed {ipo.totalSubscription}x</span>
              <MetricInfo id="ipo_subscription" name="Subscription Multiple" iconSize="xs" />
            </p>
          ) : null}
          <p className="pt-1 text-sm font-semibold text-primary">View details →</p>
        </Card>
      ))}
    </div>
  );
}
