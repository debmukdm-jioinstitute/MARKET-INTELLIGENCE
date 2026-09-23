"use client";

import type { SymbolSearchHit } from "@/lib/feeds/symbol-search";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export function SymbolSearch({
  initialQuery = "",
  autoFocus,
  className,
  variant = "default",
  showShortcut = true,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
  className?: string;
  /** `hero` = full-width focal search; `bar` = top bar strip */
  variant?: "default" | "hero" | "bar";
  showShortcut?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [hits, setHits] = useState<SymbolSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const prominent = variant === "hero" || variant === "bar";

  useEffect(() => {
    if (initialQuery) setQ(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setHits([]);
      setOpen(false);
      return;
    }
    const id = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/feeds/search/symbols?q=${encodeURIComponent(trimmed)}`);
        const json = (await res.json()) as { hits?: SymbolSearchHit[] };
        setHits(json.hits ?? []);
        setOpen((json.hits?.length ?? 0) > 0);
        setActive(0);
      } catch {
        setHits([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => window.clearTimeout(id);
  }, [q]);

  const pick = useCallback(
    (hit: SymbolSearchHit) => {
      setOpen(false);
      router.push(`/research/${encodeURIComponent(hit.symbol)}`);
    },
    [router],
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!showShortcut) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.code === "Space" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        wrapRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showShortcut]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full",
        variant === "default" && "max-w-xl",
        variant === "hero" && "max-w-5xl",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-center gap-3 rounded-full bg-card/95 transition-shadow",
          prominent
            ? "border-2 border-[#1a73e8] shadow-[0_0_0_1px_rgba(26, 115, 232,0.35),0_8px_40px_rgba(26, 115, 232,0.12)] focus-within:shadow-[0_0_0_2px_rgba(26, 115, 232,0.55),0_12px_48px_rgba(26, 115, 232,0.18)]"
            : "border border-border",
          variant === "hero" && "h-16 px-6",
          variant === "bar" && "h-11 px-4",
          variant === "default" && "h-10 px-3",
        )}
      >
        <Search
          className={cn(
            "shrink-0 text-[#1a73e8]",
            variant === "hero" ? "size-6" : "size-4",
          )}
          aria-hidden
        />
        <Input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => (hits.length ? setOpen(true) : setOpen(false))}
          onKeyDown={(e) => {
          if (!open || !hits.length) {
            if (e.key === "Enter" && q.trim()) {
              router.push(`/research/${encodeURIComponent(q.trim().toUpperCase())}`);
            }
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(hits[active]!);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
          placeholder={
            variant === "hero"
              ? "Search India & US symbols — Reliance, TCS, NVDA, SPY…"
              : "Search India (NSE) or US ticker"
          }
          className={cn(
            "border-0 bg-transparent font-mono uppercase shadow-none focus-visible:ring-0",
            variant === "hero" ? "h-14 text-lg md:text-xl" : "h-9 text-sm",
          )}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-label="Search symbols"
        />
        {showShortcut ? (
          <kbd
            className={cn(
              "hidden shrink-0 rounded-md border border-[#1a73e8]/50 bg-background/80 px-2 py-0.5 font-mono text-[10px] text-[#1a73e8] sm:inline",
              variant === "hero" && "text-xs px-2.5 py-1",
            )}
          >
            Space
          </kbd>
        ) : null}
      </div>
      {open ? (
        <ul
          className={cn(
            "animate-dropdown-pop absolute z-50 mt-2 w-full overflow-auto rounded-2xl border border-[#1a73e8]/50 bg-popover/85 py-1.5 shadow-[0_0_0_1px_rgba(26, 115, 232,0.12),0_20px_60px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl backdrop-saturate-150 [perspective:900px]",
            variant === "hero" ? "max-h-96" : "max-h-72",
          )}
          role="listbox"
        >
          {loading && !hits.length ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
          ) : null}
          {hits.map((h, i) => (
            <li
              key={`${h.market}-${h.symbol}`}
              className="animate-dropdown-item px-1.5"
              style={{ animationDelay: `${Math.min(i, 8) * 22}ms` }}
            >
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-all duration-150 will-change-transform hover:-translate-y-0.5 hover:bg-[#1a73e8]/10 hover:shadow-[0_6px_16px_-4px_rgba(26, 115, 232,0.25)]",
                  i === active && "-translate-y-0.5 bg-[#1a73e8]/10 shadow-[0_6px_16px_-4px_rgba(26, 115, 232,0.25)]",
                )}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(h)}
              >
                <span>
                  <span className="font-mono font-medium">{h.symbol}</span>
                  <span className="ml-2 text-muted-foreground">{h.name}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] uppercase text-primary">
                  {h.market === "IN" ? "India" : "US"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
