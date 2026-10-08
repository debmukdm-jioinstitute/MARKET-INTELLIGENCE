"use client";

import type { SymbolSearchHit } from "@/lib/feeds/symbol-search";
import type { HelpTopic } from "@/lib/help/help-search-index";
import type { UnifiedSearchResult } from "@/lib/search/unified-search";
import { isNaturalLanguageQuery } from "@/lib/search/nl-intent";
import { openSiteAssistant } from "@/lib/home/open-assistant";
import {
  RESEARCH_SEARCH_PLACEHOLDER_PREFIX,
  RESEARCH_SEARCH_PLACEHOLDER_STATIC,
  RESEARCH_SEARCH_TYPING_SAMPLES,
} from "@/lib/research/search-typing-samples";
import { useTypingPlaceholder } from "@/hooks/use-typing-placeholder";
import { getRecentSymbols, type RecentSymbol } from "@/lib/research/recent-symbols";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { awardXp } from "@/lib/gamification/client";
import { usePortalPages } from "@/components/providers/portal-page-provider";

/** Per-session result cache: backspacing / retyping a query is instant, no network. */
const RESULT_CACHE = new Map<string, UnifiedSearchResult>();
const RESULT_CACHE_MAX = 200;
const DEBOUNCE_MS = 60;
let warmed = false;

/** Fire one throwaway query so a cold server instance loads its symbol index before the first real keystroke. */
function warmSearch() {
  if (warmed) return;
  warmed = true;
  void fetch("/api/search/unified?q=nse").catch(() => {
    warmed = false;
  });
}

/**
 * One entry in the merged, keyboard-navigable results list. This is the
 * "unified" part of the unified search bar: a ticker, a portal page, a help
 * topic, and the Ask Deb fallback all live in the same list with the same
 * selection model — not three separate widgets glued together.
 */
type ResultItem =
  | { kind: "symbol"; hit: SymbolSearchHit }
  | { kind: "page"; href: string; label: string; description: string }
  | { kind: "help"; topic: HelpTopic }
  | { kind: "ask"; query: string };

const EMPTY_RESULT: UnifiedSearchResult = {
  query: "",
  isQuestion: false,
  symbols: [],
  pages: [],
  help: [],
  suggestAsk: false,
};

function buildItems(result: UnifiedSearchResult): ResultItem[] {
  const items: ResultItem[] = [];
  items.push(...result.symbols.map((hit): ResultItem => ({ kind: "symbol", hit })));

  // A detected question surfaces help content before generic pages (it's
  // almost always what "how do I connect X" is looking for); a well-formed
  // ticker/page query keeps pages first since that's the common case today.
  const pageItems: ResultItem[] = result.pages.map((p) => ({ kind: "page", href: p.href, label: p.label, description: p.description }));
  const helpItems: ResultItem[] = result.help.map((topic) => ({ kind: "help", topic }));
  items.push(...(result.isQuestion ? [...helpItems, ...pageItems] : [...pageItems, ...helpItems]));

  if (result.suggestAsk && result.query) {
    items.push({ kind: "ask", query: result.query });
  }
  return items;
}

export function SymbolSearch({
  initialQuery = "",
  autoFocus,
  className,
  variant = "default",
  showShortcut = true,
  typingPlaceholder = false,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
  className?: string;
  /** `hero` = full-width focal search; `bar` = top bar strip */
  variant?: "default" | "hero" | "bar";
  /** Cycle Nifty 50–style names in the placeholder (research hub). */
  typingPlaceholder?: boolean;
  showShortcut?: boolean;
}) {
  const router = useRouter();
  const { hrefAllowed } = usePortalPages();
  const [q, setQ] = useState(initialQuery);
  const [result, setResult] = useState<UnifiedSearchResult>(EMPTY_RESULT);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hasUserTyped, setHasUserTyped] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  // "Continue where you left off": recent symbols shown when the box is focused but empty.
  const [recents, setRecents] = useState<RecentSymbol[]>([]);
  const [recentsOpen, setRecentsOpen] = useState(false);

  const prominent = variant === "hero" || variant === "bar";
  const items = buildItems(
    // Locked/disabled portal pages stay out of the dropdown (same rule as the ⌘K palette).
    { ...result, pages: result.pages.filter((p) => hrefAllowed(p.href)) },
  );
  // Top company match (for the deep-research nudge) and the index of the last
  // company row so the nudge lands right after all company rows.
  const topSymbolItem = items.find((i): i is Extract<ResultItem, { kind: "symbol" }> => i.kind === "symbol") ?? null;
  const topSymbolHit = topSymbolItem?.hit ?? null;
  const lastSymbolIdx = items.reduce((acc, item, idx) => (item.kind === "symbol" ? idx : acc), -1);

  const typingActive = typingPlaceholder && !q.trim() && !hasUserTyped && !isFocused;
  const animatedPlaceholder = useTypingPlaceholder({
    enabled: typingActive,
    prefix: RESEARCH_SEARCH_PLACEHOLDER_PREFIX,
    samples: RESEARCH_SEARCH_TYPING_SAMPLES,
  });

  const placeholder =
    variant === "hero"
      ? typingPlaceholder
        ? animatedPlaceholder
        : RESEARCH_SEARCH_PLACEHOLDER_STATIC
      : "Search India (NSE) or US ticker, or ask a question";

  useEffect(() => {
    setQ(initialQuery);
    setHasUserTyped(false);
    setResult(EMPTY_RESULT);
    setOpen(false);
  }, [initialQuery]);

  useEffect(() => {
    // Only search and show dropdown when the user has actively typed into this input
    if (!hasUserTyped) {
      setResult(EMPTY_RESULT);
      setOpen(false);
      return;
    }

    const trimmed = q.trim();
    if (trimmed.length < 1) {
      // Query cleared: fall back to the recently-viewed list while focused.
      setResult(EMPTY_RESULT);
      setOpen(false);
      const r = getRecentSymbols();
      setRecents(r);
      setActive(0);
      setRecentsOpen(r.length > 0 && isFocused);
      return;
    }
    setRecentsOpen(false);

    const apply = (json: UnifiedSearchResult) => {
      setResult(json);
      const hasAny = json.symbols.length > 0 || json.pages.length > 0 || json.help.length > 0 || json.suggestAsk;
      setOpen(hasAny);
      setActive(0);
    };

    const key = trimmed.toLowerCase();
    const hit = RESULT_CACHE.get(key);
    if (hit) {
      apply(hit);
      return;
    }

    // Abort the in-flight request when the query changes so a slow earlier response can never
    // overwrite the newer one (and never keeps the spinner state wrong).
    const ctrl = new AbortController();
    const id = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/unified?q=${encodeURIComponent(trimmed)}`, { signal: ctrl.signal });
        const json = (await res.json()) as UnifiedSearchResult;
        if (res.ok) {
          if (RESULT_CACHE.size >= RESULT_CACHE_MAX) RESULT_CACHE.delete(RESULT_CACHE.keys().next().value as string);
          RESULT_CACHE.set(key, json);
        }
        apply(json);
        setLoading(false);
      } catch (e) {
        if ((e as { name?: string }).name === "AbortError") return;
        setResult(EMPTY_RESULT);
        setOpen(false);
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(id);
      ctrl.abort();
    };
  }, [q, hasUserTyped, isFocused]);

  const selectItem = useCallback(
    (item: ResultItem) => {
      if (item.kind === "symbol") {
        setOpen(false);
        // Fire-and-forget: silently no-ops for guests/offline.
        void awardXp("search_used", item.hit.symbol);
        router.push(`/research/${encodeURIComponent(item.hit.symbol)}`);
        return;
      }
      if (item.kind === "page" || item.kind === "help") {
        setOpen(false);
        const href = item.kind === "page" ? item.href : item.topic.href;
        router.push(href);
        return;
      }
      // kind === "ask": hand the raw question to Ask Deb and let it actually
      // answer (route + explain), instead of guessing a single static page.
      setOpen(false);
      openSiteAssistant(item.query);
    },
    [router],
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setRecentsOpen(false);
      }
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
        // Only hijack Space if this is the hero search variant on the landing/hub page.
        // On normal content pages (variant === "bar" or "default"), Space is standard page scrolling.
        if (variant !== "hero") return;
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
          onChange={(e) => {
            setHasUserTyped(true);
            setQ(e.target.value);
          }}
          onFocus={() => {
            setIsFocused(true);
            warmSearch();
            if (hasUserTyped && items.length > 0) {
              setOpen(true);
            } else if (!q.trim()) {
              const r = getRecentSymbols();
              setRecents(r);
              setActive(0);
              setRecentsOpen(r.length > 0);
            }
          }}
          onBlur={() => {
            setIsFocused(false);
          }}
          onKeyDown={(e) => {
            // Recently-viewed mode: its own small keyboard model (list is not
            // part of the unified ResultItem selection above).
            if (recentsOpen && !open && recents.length > 0) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, recents.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const r = recents[active];
                if (r) {
                  setRecentsOpen(false);
                  router.push(`/research/${encodeURIComponent(r.symbol)}`);
                }
              } else if (e.key === "Escape") {
                setRecentsOpen(false);
              }
              return;
            }
            if (!open || !items.length) {
              // The debounced fetch (200ms) may not have resolved yet — a
              // fast typist can hit Enter before `items` populates. This is
              // the pre-existing "go straight to a ticker page" fallback for
              // that gap, but firing it unconditionally sent any sentence
              // typed into the bar (e.g. the task's own MCP question) to
              // `/research/<THE-WHOLE-SENTENCE>`, a nonexistent symbol page,
              // instead of ever reaching the help/Ask Deb routing this bar
              // exists to provide. Gate it on the same question-shape check
              // the rest of the bar uses: a question never falls through to
              // the raw ticker route, even mid-debounce.
              const trimmed = q.trim();
              if (e.key === "Enter" && trimmed && !isNaturalLanguageQuery(trimmed)) {
                setHasUserTyped(false);
                setIsFocused(false);
                setOpen(false);
                void awardXp("search_used", trimmed.toUpperCase());
                router.push(`/research/${encodeURIComponent(trimmed.toUpperCase())}`);
              }
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              selectItem(items[active]!);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className={cn(
            "border-0 bg-transparent shadow-none focus-visible:ring-0",
            variant === "hero" ? "h-14 text-lg md:text-xl" : "h-9 text-base sm:text-sm",
          )}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-label="Search symbols, pages, and help"
        />
        {showShortcut ? (
          <kbd
            className={cn(
              "hidden shrink-0 rounded-md border border-[#1a73e8]/50 bg-background/80 px-2 py-0.5 text-sm text-[#1a73e8] sm:inline",
              variant === "hero" && "text-sm px-2.5 py-1",
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
          {loading && !items.length ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Searching…</li>
          ) : null}
          {items.map((item, i) => (
            <Fragment key={itemKey(item)}>
              <ResultRow
                item={item}
                index={i}
                active={i === active}
                onHover={() => setActive(i)}
                onSelect={() => selectItem(item)}
              />
              {/* Deep-research nudge, right after the company rows. Not part of
                  keyboard nav (mouse/tap only) so the existing selection model
                  is untouched. */}
              {i === lastSymbolIdx && topSymbolHit ? (
                <ResearchNudgeRow
                  hit={topSymbolHit}
                  index={i}
                  onSelect={() => {
                    setOpen(false);
                    void awardXp("search_used", topSymbolHit.symbol);
                    router.push(`/research/${encodeURIComponent(topSymbolHit.symbol)}`);
                  }}
                />
              ) : null}
            </Fragment>
          ))}
        </ul>
      ) : null}
      {recentsOpen && !open ? (
        <ul
          className={cn(
            "animate-dropdown-pop absolute z-50 mt-2 w-full overflow-auto rounded-2xl border border-[#1a73e8]/50 bg-popover/85 py-1.5 shadow-[0_0_0_1px_rgba(26,115,232,0.12),0_20px_60px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl backdrop-saturate-150",
            variant === "hero" ? "max-h-96" : "max-h-72",
          )}
          role="listbox"
          aria-label="Recently viewed"
        >
          <li className="px-3 pt-1.5 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recently viewed
          </li>
          {recents.map((r, i) => (
            <li key={r.symbol} className="animate-dropdown-item px-1.5">
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  setRecentsOpen(false);
                  router.push(`/research/${encodeURIComponent(r.symbol)}`);
                }}
                className={cn(
                  "flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-all duration-150 will-change-transform hover:-translate-y-0.5 hover:bg-[#1a73e8]/10 hover:shadow-[0_6px_16px_-4px_rgba(26,115,232,0.25)]",
                  i === active && "-translate-y-0.5 bg-[#1a73e8]/10 shadow-[0_6px_16px_-4px_rgba(26,115,232,0.25)]",
                )}
              >
                <span className="min-w-0">
                  <span className="font-medium">{r.symbol}</span>
                  <span className="ml-2 truncate text-muted-foreground">{r.name}</span>
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">Recent</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function itemKey(item: ResultItem): string {
  if (item.kind === "symbol") return `symbol-${item.hit.market}-${item.hit.symbol}`;
  if (item.kind === "page") return `page-${item.href}`;
  if (item.kind === "help") return `help-${item.topic.id}`;
  return "ask";
}

function ResearchNudgeRow({ hit, index, onSelect }: { hit: SymbolSearchHit; index: number; onSelect: () => void }) {
  const name = hit.name?.trim() || hit.symbol;
  return (
    <li className="animate-dropdown-item px-1.5" style={{ animationDelay: `${Math.min(index + 1, 8) * 22}ms` }}>
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Do deep research on ${name}`}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-border px-2.5 py-2 text-left text-sm transition-all duration-150 will-change-transform hover:-translate-y-0.5 hover:bg-primary/5"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0">
            <span className="block truncate font-medium">Do deep research on {name}</span>
            <span className="block text-xs text-muted-foreground">Full AI research + earn XP</span>
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">+10 XP</span>
      </button>
    </li>
  );
}

function ResultRow({
  item,
  index,
  active,
  onHover,
  onSelect,
}: {
  item: ResultItem;
  index: number;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const rowClass = cn(
    "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-all duration-150 will-change-transform hover:-translate-y-0.5 hover:bg-[#1a73e8]/10 hover:shadow-[0_6px_16px_-4px_rgba(26, 115, 232,0.25)]",
    active && "-translate-y-0.5 bg-[#1a73e8]/10 shadow-[0_6px_16px_-4px_rgba(26, 115, 232,0.25)]",
  );

  return (
    <li className="animate-dropdown-item px-1.5" style={{ animationDelay: `${Math.min(index, 8) * 22}ms` }}>
      <button type="button" role="option" aria-selected={active} className={rowClass} onMouseEnter={onHover} onClick={onSelect}>
        {item.kind === "symbol" ? (
          <>
            <span>
              <span className="font-medium">{item.hit.symbol}</span>
              <span className="ml-2 text-muted-foreground">{item.hit.name}</span>
            </span>
            <span className="shrink-0 text-sm uppercase text-primary">{item.hit.market === "IN" ? "India" : "US"}</span>
          </>
        ) : null}
        {item.kind === "page" ? (
          <>
            <span>
              <span className="font-medium">{item.label}</span>
              <span className="ml-2 text-muted-foreground">{item.description}</span>
            </span>
            <span className="shrink-0 text-sm text-muted-foreground">Page</span>
          </>
        ) : null}
        {item.kind === "help" ? (
          <>
            <span>
              <span className="font-medium">{item.topic.title}</span>
              <span className="ml-2 text-muted-foreground">{item.topic.blurb}</span>
            </span>
            <span className="shrink-0 text-sm text-muted-foreground">Help</span>
          </>
        ) : null}
        {item.kind === "ask" ? (
          <span className="flex w-full items-center gap-2 text-primary">
            <Sparkles className="size-4 shrink-0" aria-hidden />
            <span>
              Ask Deb: <span className="font-medium">&ldquo;{item.query}&rdquo;</span>
            </span>
          </span>
        ) : null}
      </button>
    </li>
  );
}
