"use client";

import { Panel } from "@/components/layout/page-header";
import { fmtInr } from "@/lib/format-india";
import type { IpoListing } from "@/lib/feeds/ipo/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

interface IpoPanelProps {
  symbol: string;
  currentPrice?: number | null;
}

export function IpoPanel({ symbol, currentPrice }: IpoPanelProps) {
  const [ipo, setIpo] = useState<IpoListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/feeds/ipo?status=listed&symbol=${encodeURIComponent(symbol)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setIpo(null);
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        setIpo(json.match ?? json.ipos?.[0] ?? null);
      } catch {
        if (!cancelled) setIpo(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (symbol) load();

    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) return null;
  // If not a recent IPO, hide cleanly (Handbook: "Non-applicable blocks should disappear, not show dead cards")
  if (!ipo) return null;

  // Issue price parsing: maxPrice or minPrice
  const issuePriceNum = ipo.maxPrice > 0 ? ipo.maxPrice : ipo.minPrice > 0 ? ipo.minPrice : null;

  // Calculate return since issue price (Handbook P1 Semantics: distinct from listing day gain)
  const returnSinceIssue =
    issuePriceNum != null && currentPrice != null && currentPrice > 0
      ? ((currentPrice - issuePriceNum) / issuePriceNum) * 100
      : null;

  // Normalize subscription multiple (Handbook P1: ensure "x" unit)
  let subDisplay = ipo.totalSubscription ? String(ipo.totalSubscription) : "—";
  if (subDisplay !== "—" && !subDisplay.toLowerCase().endsWith("x")) {
    subDisplay = `${subDisplay}x`;
  }

  const priceBandText =
    ipo.minPrice === ipo.maxPrice || !ipo.minPrice
      ? fmtInr(ipo.maxPrice || ipo.minPrice)
      : `${fmtInr(ipo.minPrice)} – ${fmtInr(ipo.maxPrice)}`;

  return (
    <Panel
      title="IPO & Listing History"
      subtitle="Public offering parameters and cumulative post-listing performance."
      action={
        <Link href="/research/ipo" className="text-sm font-semibold text-primary hover:underline">
          IPO & GMP Tracker →
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-sm uppercase tracking-wide text-muted-foreground">Issue Price / Band</span>
            <p className="text-xl font-bold tabular-nums text-foreground mt-1">
              {priceBandText}
            </p>
            <span className="text-sm text-muted-foreground">Offer price to investors</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-sm uppercase tracking-wide text-muted-foreground">Subscription Multiple</span>
            <p className="text-xl font-bold tabular-nums text-foreground mt-1">{subDisplay}</p>
            <span className="text-sm text-muted-foreground">Overall investor book demand</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-sm uppercase tracking-wide text-muted-foreground">Return Since Issue</span>
            {returnSinceIssue != null ? (
              <p
                className={cn(
                  "text-xl font-bold tabular-nums mt-1",
                  returnSinceIssue >= 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {returnSinceIssue >= 0 ? "+" : ""}{returnSinceIssue.toFixed(1)}%
              </p>
            ) : (
              <p className="text-xl font-bold text-muted-foreground mt-1">—</p>
            )}
            <span className="text-sm text-muted-foreground">Cumulative return vs issue price</span>
          </div>

          <div className="rounded-lg border border-border/60 bg-card p-3">
            <span className="text-sm uppercase tracking-wide text-muted-foreground">Issue Timeline</span>
            <p className="text-sm font-semibold text-foreground mt-1">
              {ipo.biddingEndDate ? `Closed ${ipo.biddingEndDate}` : "Recent listing"}
            </p>
            <span className="text-sm text-muted-foreground">NSE / BSE official listing</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground border-t border-border/40 pt-2">
          Listing return is calculated against the final public issue price. For historical gray market premium (GMP) and listing day performance, visit the IPO Intelligence Hub.
        </p>
      </div>
    </Panel>
  );
}
