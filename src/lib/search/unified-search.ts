import { searchSymbols, type SymbolSearchHit } from "@/lib/feeds/symbol-search";
import { searchPages, type PageSearchResult } from "@/lib/site-assistant/site-map";
import { searchHelpTopics, type HelpTopic } from "@/lib/help/help-search-index";
import { isNaturalLanguageQuery } from "@/lib/search/nl-intent";

export type UnifiedSearchResult = {
  query: string;
  /** True when the query looks like a sentence/question, not a ticker/company fragment. */
  isQuestion: boolean;
  symbols: SymbolSearchHit[];
  pages: PageSearchResult[];
  help: HelpTopic[];
  /**
   * Show an "Ask Deb about this" affordance. Always true for a detected
   * question; also true when nothing else matched, so a stray query never
   * dead-ends on "No results" — it can still be handed to the assistant.
   */
  suggestAsk: boolean;
};

const EMPTY: UnifiedSearchResult = {
  query: "",
  isQuestion: false,
  symbols: [],
  pages: [],
  help: [],
  suggestAsk: false,
};

/**
 * One search across everything the site knows how to look up: ticker/company
 * symbols (existing `searchSymbols`, already typo-tolerant), portal pages
 * (existing `searchPages`), and this site's own help content (new,
 * `searchHelpTopics`) — plus a signal for whether to also offer the Ask Deb
 * assistant, for anything the deterministic matchers don't confidently place.
 *
 * Deliberately NOT an ML/NLU call: distinguishing "relaince" (typo'd ticker)
 * from "how do I connect mcp to claude" (question) doesn't need one, and a
 * network round-trip to a hosted model would make every keystroke in a
 * website search bar slower for no accuracy gain. See the symbol-search.tsx
 * / unified-search architecture note for the full trade-off writeup.
 */
export async function unifiedSearch(query: string): Promise<UnifiedSearchResult> {
  const q = query.trim();
  if (!q) return EMPTY;

  const isQuestion = isNaturalLanguageQuery(q);

  // Run every matcher in parallel — never skip the symbol lookup outright.
  // An earlier version skipped the network-bound symbol search whenever a
  // question also produced *any* page match, on the theory that a sentence
  // "never wins" against a page/help hit. That was false: `searchPages`'s
  // token-overlap scorer readily matches generic words ("doing", "right",
  // "now") in unrelated page descriptions, so a real ticker mention inside a
  // sentence (e.g. "how is TCS doing right now") got its symbol search
  // dropped even though nothing relevant was actually found elsewhere. A
  // dropped-vs-kept decision this important should never hinge on noisy page
  // hits; running it in parallel costs nothing (no request is serialized
  // behind another) and guarantees requirement 1 (typo/ticker must never
  // silently disappear) holds for every query shape, including this one.
  // `searchPages`'s token-overlap scorer treats any substring hit against a
  // page's label/description/href as a signal — for a 1-2 character query
  // that's nearly every page ("l" is inside "Portfolios", "Allocation",
  // "World indices", ...). A query that short can't carry enough information
  // to mean a page anyway; leave that ground to the symbol matcher (which
  // already length-gates its own fuzzy branch) instead of cluttering the
  // dropdown with noise on the very first keystrokes.
  const pagesQuery = q.length >= 3 ? q : "";

  // `searchSymbols` can, on a cold module-level cache, fetch the full NSE
  // instrument list before resolving — `feedFetch(NSE_GZ, { timeoutMs:
  // 45_000 })` in `symbol-search.ts`. Awaiting it unraced inside this
  // `Promise.all` would block help/page results (which need none of that
  // fetch) behind up to 45s on the very first query a fresh server process
  // sees — a bar whose whole point is to "never dead-end" would instead
  // hang silently on first use, and would fail requirement 5's "stress
  // testing" bar outright. (Caught live: `unified-search.test.ts`'s own
  // "routes the task's own NL example to the MCP help topic" test timed out
  // at vitest's 5s default against a cold cache before this fix.) Race the
  // symbol branch against a budget tuned for an interactive dropdown: on
  // timeout, this keystroke shows no symbols (help/pages still render — the
  // bar never blocks), while the NSE load keeps running in the background
  // and warms the cache for the next keystroke, which resolves instantly.
  const SYMBOL_SEARCH_BUDGET_MS = 2_500;
  const symbolsWithBudget = Promise.race<SymbolSearchHit[]>([
    searchSymbols(q, isQuestion ? 3 : 8).catch(() => []),
    new Promise<SymbolSearchHit[]>((resolve) => setTimeout(() => resolve([]), SYMBOL_SEARCH_BUDGET_MS)),
  ]);

  const [help, pagesRaw, symbols] = await Promise.all([
    Promise.resolve(searchHelpTopics(q, 3)),
    Promise.resolve(pagesQuery ? searchPages(pagesQuery, isQuestion ? 5 : 4) : []),
    symbolsWithBudget,
  ]);

  // `PAGE_COMMANDS` (searched by `searchPages`, also used by the ⌘K command
  // palette and Ask Deb's `search_pages` tool) carries generic top-level
  // entries for `/help` and `/connect/claude` so those destinations are
  // still reachable outside this bar. `help-search-index.ts` is the
  // purpose-built, anchored index over the *same* `/help` page's sections
  // (`/help#mcp`, `/help#account`, ...) with real blurbs. For a query like
  // "mcp" both can legitimately score: the generic "Connect Claude (MCP)"
  // page row and the specific "Connect ... to Claude / Cursor (MCP)" help
  // row. Showing both is the "three disconnected systems" outcome this bar
  // exists to avoid — so when a page hit's own path is the same page (or a
  // parent of the page) a help hit already points into, drop the page hit
  // and let the more specific, anchored help row win.
  const helpBasePaths = new Set(help.map((h) => h.href.split("#")[0]));
  const pages = pagesRaw.filter((p) => !helpBasePaths.has(p.href.split("#")[0]));

  const hasMatch = symbols.length > 0 || help.length > 0 || pages.length > 0;
  const suggestAsk = isQuestion || !hasMatch;

  return { query: q, isQuestion, symbols, pages, help, suggestAsk };
}
