"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type FlagLogRow = {
  flagged_date: string;
  symbol: string;
  headline: string;
  confidence: string;
  price_at_flag: number | null;
};

/** Doc: "Track your flags... After three months you will know your real hit rate rather than remembering the flags that worked." This is the log every screener run writes to automatically. */
export function FlagHistory() {
  const router = useRouter();
  const [flags, setFlags] = useState<FlagLogRow[]>([]);
  const [dbConfigured, setDbConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/options-flow/history")
      .then((r) => r.json())
      .then((json) => {
        setFlags(json.flags ?? []);
        setDbConfigured(json.dbConfigured !== false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!dbConfigured) {
    return (
      <p className="text-xs text-muted-foreground">
        No database configured — flag history needs DATABASE_URL / POSTGRES_URL set to log runs over time.
      </p>
    );
  }
  if (loading) return <p className="text-xs text-muted-foreground">Loading flag log…</p>;
  if (flags.length === 0) {
    return <p className="text-xs text-muted-foreground">No flags logged yet — run the screener to start building a track record.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Ticker</th>
            <th className="px-3 py-2 text-left">What was unusual</th>
            <th className="px-3 py-2 text-left">Confidence</th>
            <th className="px-3 py-2 text-right">Price at flag</th>
          </tr>
        </thead>
        <tbody>
          {flags.map((f) => (
            <tr
              key={`${f.flagged_date}-${f.symbol}`}
              className="cursor-pointer border-t border-border/60 hover:bg-muted/50"
              onClick={() => router.push(`/research/${encodeURIComponent(f.symbol)}`)}
            >
              <td className="px-3 py-2 font-mono">{f.flagged_date}</td>
              <td className="px-3 py-2 font-mono font-medium text-primary hover:underline">{f.symbol}</td>
              <td className="max-w-[420px] px-3 py-2 text-muted-foreground">{f.headline}</td>
              <td className="px-3 py-2 uppercase text-muted-foreground">{f.confidence}</td>
              <td className="px-3 py-2 text-right font-mono">{f.price_at_flag != null ? f.price_at_flag.toFixed(2) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
