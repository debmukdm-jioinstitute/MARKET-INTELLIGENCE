"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricInfo } from "@/components/ui/metric-info";
import type { IpoListing } from "@/lib/feeds/ipo/types";
import { fmtInr } from "@/lib/format-india";

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
          <p className="text-xs text-muted-foreground">{ipo.industry}</p>
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="flex items-center gap-1">
              {fmtInr(ipo.minPrice)}–{fmtInr(ipo.maxPrice)}
              <MetricInfo id="ipo_gmp" name="Price Band" iconSize="xs" />
            </span>
            <span className="text-muted-foreground">
              {ipo.biddingStartDate} → {ipo.biddingEndDate}
            </span>
          </div>
          {ipo.totalSubscription ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span>Subscribed {ipo.totalSubscription}x</span>
              <MetricInfo id="ipo_subscription" name="Subscription Multiple" iconSize="xs" />
            </p>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
