"use client";

/**
 * Similar Stocks panel — powered by MiniLM-L6-v2 semantic embeddings.
 *
 * Shows up to 5 stocks that are semantically similar to the current one,
 * based on company name + sector text similarity via /api/hf/similar-stocks.
 */

import useSWR from "swr";
import Link from "next/link";

interface SimilarStock {
  symbol: string;
  name: string;
  sector: string | null;
  similarity: number;
}

interface SimilarStocksResponse {
  symbol: string;
  similar: SimilarStock[];
  model: string;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<SimilarStocksResponse>);

function SimilarityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/60 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

export function SimilarStocksPanel({ symbol }: { symbol: string }) {
  const { data, isLoading } = useSWR<SimilarStocksResponse>(
    symbol ? `/api/hf/similar-stocks?symbol=${encodeURIComponent(symbol)}&limit=5` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  );

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-muted/10 p-4 animate-pulse space-y-2">
        <div className="h-3 bg-muted rounded w-40 mb-3" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-2 bg-muted rounded" />
        ))}
      </div>
    );
  }

  if (!data || data.error || !data.similar?.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔗</span>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-foreground">Similar Companies</p>
          <p className="text-xs text-muted-foreground">Semantic similarity · MiniLM-L6-v2</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {data.similar.map((s) => (
          <div key={s.symbol} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <Link
                href={`/research/${encodeURIComponent(s.symbol)}`}
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
              >
                {s.symbol}
              </Link>
              <span className="text-xs text-muted-foreground line-clamp-1 max-w-[160px] text-right">
                {s.name}
              </span>
            </div>
            <SimilarityBar value={s.similarity} />
            {s.sector && (
              <p className="text-xs text-muted-foreground">{s.sector}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
