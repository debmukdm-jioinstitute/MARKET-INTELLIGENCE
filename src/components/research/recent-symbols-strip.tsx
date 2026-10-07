"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { History } from "lucide-react";
import {
  getRecentSymbols,
  subscribeRecentSymbols,
  type RecentSymbol,
} from "@/lib/research/recent-symbols";

const EMPTY: RecentSymbol[] = [];

/**
 * "Continue where you left off" chip strip for the research home page.
 * Renders nothing until the user has viewed at least one symbol.
 */
export function RecentSymbolsStrip() {
  const recents = useSyncExternalStore(subscribeRecentSymbols, getRecentSymbols, () => EMPTY);
  if (recents.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <History className="size-3.5" aria-hidden />
        Recently viewed
      </p>
      <ul className="flex flex-wrap gap-2">
        {recents.map((r) => (
          <li key={r.symbol}>
            <Link
              href={`/research/${encodeURIComponent(r.symbol)}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:border-primary/50 hover:bg-accent/50"
            >
              <span className="font-semibold">{r.symbol}</span>
              <span className="max-w-[160px] truncate text-muted-foreground">{r.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
