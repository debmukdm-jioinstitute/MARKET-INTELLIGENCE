"use client";

/** Shared semantic search box for /help, /learn, and /data/feeds, backed by
 * /api/hf/semantic-search. Debounced; renders nothing extra when the query is empty or the HF
 * call fails — the page underneath is unaffected either way. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";

type Result = { title: string; blurb: string; href: string; similarity: number };

export function SemanticSearchBox({ corpus, placeholder }: { corpus: "help" | "learn" | "feeds"; placeholder: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/hf/semantic-search?corpus=${corpus}&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((json) => {
          if (!cancelled) setResults(Array.isArray(json.results) ? json.results : []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, corpus]);

  return (
    <div className="mb-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        {loading ? <Sparkles className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-pulse text-primary" /> : null}
      </div>
      {results.length > 0 ? (
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
          {results.map((r) => (
            <li key={r.href}>
              {r.href.startsWith("/") ? (
                <Link href={r.href} className="block px-3 py-2 hover:bg-accent/40">
                  <p className="text-sm font-semibold text-primary">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.blurb}</p>
                </Link>
              ) : (
                <a href={r.href} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 hover:bg-accent/40">
                  <p className="text-sm font-semibold text-primary">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.blurb}</p>
                </a>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
