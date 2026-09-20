"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
            <p className="font-semibold leading-tight">{ipo.name}</p>
            <Badge variant="outline" className="shrink-0 uppercase">
              {ipo.issueType}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{ipo.industry}</p>
          <div className="flex items-center justify-between font-mono text-xs">
            <span>
              {fmtInr(ipo.minPrice)}–{fmtInr(ipo.maxPrice)}
            </span>
            <span className="text-muted-foreground">
              {ipo.biddingStartDate} → {ipo.biddingEndDate}
            </span>
          </div>
          {ipo.totalSubscription ? (
            <p className="text-xs text-muted-foreground">
              Subscribed {ipo.totalSubscription}x
            </p>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
