"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { motion, useReducedMotion } from "framer-motion";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import { ChevronDown, ListFilter, Search } from "lucide-react";
import { useMarketStatus } from "@/hooks/use-market-status";
import { formatPct } from "@/lib/format";
import { fmtCr, fmtInr, fmtNum } from "@/lib/format-india";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Types (defensive — matches the /api/indices/[slug]/constituents    */
/* contract, tolerating the { quote: null } list-only variant)        */
/* ------------------------------------------------------------------ */

export type IndexConstituent = {
  symbol: string;
  name: string;
  industry: string;
  isin: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  marketCap: number | null;
  quoteAsOf: string | null;
};

type ConstituentsPayload = {
  slug: string;
  label: string;
  count: number;
  constituents: unknown[];
  constituentsSource?: { label?: string; fetchedAt?: string } | null;
  quotesSource?: { provider?: string; asOf?: string } | null;
  quotesStatus?: string;
  reason?: string;
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function normalizeConstituent(raw: unknown): IndexConstituent {
  const c = (raw ?? {}) as Record<string, unknown>;
  const noQuote = "quote" in c && c.quote === null;
  return {
    symbol: str(c.symbol),
    name: str(c.name),
    industry: str(c.industry) || "Unclassified",
    isin: str(c.isin),
    price: noQuote ? null : num(c.price),
    change: noQuote ? null : num(c.change),
    changePct: noQuote ? null : num(c.changePct),
    dayHigh: noQuote ? null : num(c.dayHigh),
    dayLow: noQuote ? null : num(c.dayLow),
    volume: noQuote ? null : num(c.volume),
    marketCap: noQuote ? null : num(c.marketCap),
    quoteAsOf: noQuote ? null : typeof c.quoteAsOf === "string" ? c.quoteAsOf : null,
  };
}

/** Module-level fetcher (repo rule: never inline an async fetcher in a hook body). */
const fetchConstituents = async (url: string): Promise<ConstituentsPayload> => {
  const res = await fetch(url);
  const json = (await res.json()) as ConstituentsPayload;
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
  return json;
};

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/* ------------------------------------------------------------------ */
/* Sector treemap helpers                                              */
/* ------------------------------------------------------------------ */

type SectorAgg = {
  name: string;
  count: number;
  avgChange: number | null;
};

/** Emerald/rose tint by average sector day-change. Alpha carries the signal. */
function tintFor(avg: number | null): string {
  if (avg == null) return "rgba(100,116,139,0.16)";
  const t = Math.max(-1, Math.min(1, avg / 0.015));
  const alpha = (0.16 + 0.5 * Math.abs(t)).toFixed(2);
  return t >= 0 ? `rgba(16,185,129,${alpha})` : `rgba(225,29,72,${alpha})`;
}

type TileProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  depth?: number;
};

function SectorTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: Record<string, unknown> }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload ?? {};
  const avg = p.avgChange as number | null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-bold text-foreground">{String(p.name ?? "")}</p>
      <p className="text-muted-foreground">
        {String(p.size ?? 0)} stocks
        {avg != null ? (
          <>
            {" · avg "}
            <span className={cn("font-bold", avg >= 0 ? "text-emerald-600" : "text-rose-600")}>
              {formatPct(avg)}
            </span>
          </>
        ) : null}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">Click a tile to filter the table</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

type SortKey = "changePct" | "price" | "marketCap" | "name";

export function IndexConstituentsPanel({ slug }: { slug: string }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { isOpen } = useMarketStatus();

  const { data, error, isLoading } = useSWR<ConstituentsPayload>(
    `/api/indices/${encodeURIComponent(slug)}/constituents`,
    fetchConstituents,
    { dedupingInterval: 60_000, refreshInterval: 120_000, revalidateOnFocus: false },
  );

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("changePct");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  // Clears the entrance-animation transform once settled so position: sticky
  // descendants (mobile search/sort bar) keep working (repo pattern).
  const [settled, setSettled] = useState(false);

  const constituents = useMemo(
    () => (data?.constituents ?? []).map(normalizeConstituent).filter((c) => c.symbol),
    [data],
  );

  const quotesOk = data?.quotesStatus === "ok";
  const quoted = useMemo(() => constituents.filter((c) => c.price != null), [constituents]);

  const stats = useMemo(() => {
    const adv = quoted.filter((c) => (c.changePct ?? 0) > 0).length;
    const dec = quoted.filter((c) => (c.changePct ?? 0) < 0).length;
    const unc = quoted.length - adv - dec;
    const sorted = [...quoted].sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
    return { adv, dec, unc, topGainer: sorted[0] ?? null, topLoser: sorted[sorted.length - 1] ?? null };
  }, [quoted]);

  const sectors = useMemo<SectorAgg[]>(() => {
    const map = new Map<string, { count: number; sum: number; n: number }>();
    for (const c of constituents) {
      const key = c.industry || "Unclassified";
      const entry = map.get(key) ?? { count: 0, sum: 0, n: 0 };
      entry.count += 1;
      if (c.changePct != null) {
        entry.sum += c.changePct;
        entry.n += 1;
      }
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([name, e]) => ({
        name,
        count: e.count,
        avgChange: e.n > 0 ? e.sum / e.n : null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [constituents]);

  const sectorLookup = useMemo(() => new Map(sectors.map((s) => [s.name, s])), [sectors]);

  const treemapData = useMemo(
    () =>
      sectors.map((s) => ({
        name: s.name,
        size: s.count,
        avgChange: s.avgChange,
      })),
    [sectors],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = constituents;
    if (sectorFilter) rows = rows.filter((c) => c.industry === sectorFilter);
    if (q) {
      rows = rows.filter(
        (c) =>
          c.symbol.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q),
      );
    }
    const dir = sortDir;
    const val = (c: IndexConstituent): number | string => {
      switch (sortKey) {
        case "changePct":
          return c.changePct ?? Number.NEGATIVE_INFINITY;
        case "price":
          return c.price ?? Number.NEGATIVE_INFINITY;
        case "marketCap":
          return c.marketCap ?? Number.NEGATIVE_INFINITY;
        case "name":
          return c.name.toLowerCase();
      }
    };
    return [...rows].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (typeof va === "string") return dir * va.localeCompare(vb as string);
      return dir * (va - (vb as number));
    });
  }, [constituents, query, sectorFilter, sortKey, sortDir]);

  const isLarge = constituents.length > 100;
  const collapsed = isLarge && !showAll && !query.trim() && !sectorFilter;
  const visible = useMemo(() => {
    if (!collapsed) return filtered;
    return [...filtered]
      .sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0))
      .slice(0, 20);
  }, [collapsed, filtered]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? 1 : -1);
    }
  };

  const renderTile = (props: TileProps) => {
    const { x = 0, y = 0, width = 0, height = 0, name = "", depth = 0 } = props;
    if (depth !== 1 || width <= 0 || height <= 0) return <g />;
    const agg = sectorLookup.get(name);
    const selected = sectorFilter === name;
    const showText = width > 64 && height > 40;
    const showSub = width > 84 && height > 62;
    const label = name.length > 20 && width < 150 ? `${name.slice(0, 18)}…` : name;
    return (
      <g
        onClick={() => setSectorFilter((s) => (s === name ? null : name))}
        style={{ cursor: "pointer" }}
        role="button"
        aria-label={`Filter by sector ${name}`}
      >
        <rect
          x={x + 1}
          y={y + 1}
          width={Math.max(0, width - 2)}
          height={Math.max(0, height - 2)}
          rx={6}
          fill={tintFor(agg?.avgChange ?? null)}
          stroke={selected ? "#1a73e8" : "rgba(255,255,255,0.9)"}
          strokeWidth={selected ? 3 : 1.5}
        />
        {showText ? (
          <text
            x={x + width / 2}
            y={y + height / 2 - (showSub ? 8 : -4)}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill="#0f172a"
            pointerEvents="none"
          >
            {label}
          </text>
        ) : null}
        {showSub ? (
          <text
            x={x + width / 2}
            y={y + height / 2 + 12}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill={agg?.avgChange != null && agg.avgChange < 0 ? "#9f1239" : "#065f46"}
            pointerEvents="none"
          >
            {agg?.count ?? 0} stocks
            {agg?.avgChange != null ? ` · ${formatPct(agg.avgChange)}` : ""}
          </text>
        ) : null}
      </g>
    );
  };

  /* ------------------------------ states ------------------------------ */

  if (isLoading && !data) {
    return (
      <div className="bento-card-shell">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-[#1a73e8] border-t-transparent" />
          Loading constituents…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bento-card-shell">
        <p className="text-sm font-semibold text-foreground">Constituents unavailable right now</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Could not load the constituent list."} Please try again shortly.
        </p>
      </div>
    );
  }

  if (data?.reason === "no-stock-constituents") {
    return (
      <div className="bento-card-shell">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Index constituents
        </h3>
        <p className="mt-2 text-sm text-foreground">
          This index has no stock constituents — it tracks {data.label === "India VIX" ? "expected market volatility" : "government bond yields"}, not a basket of companies.
        </p>
      </div>
    );
  }

  if (data?.reason === "constituents-unavailable") {
    return (
      <div className="bento-card-shell">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Index constituents
        </h3>
        <p className="mt-2 text-sm text-foreground">
          The constituent list for {data.label} is not available from our data sources right now.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {data.constituentsSource?.label ? `Last tried: ${data.constituentsSource.label}. ` : ""}
          We publish only lists we can verify, so this section stays empty rather than guessing.
        </p>
      </div>
    );
  }

  const priceWord = isOpen ? "Live" : "Last close";
  const isSensex = /sensex/i.test(data?.label ?? "");

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45 }}
      onAnimationComplete={() => setSettled(true)}
      style={settled ? { transform: "none" } : undefined}
      className="bento-card-shell space-y-5 overflow-x-clip overflow-y-visible"
      aria-label={`${data?.label ?? "Index"} constituents`}
    >
      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border/60 pb-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Constituents</p>
          <p className="text-2xl font-extrabold tabular-nums text-foreground">{constituents.length}</p>
        </div>
        {quotesOk ? (
          <>
            <Stat label="Advancers" value={stats.adv} tone="up" />
            <Stat label="Decliners" value={stats.dec} tone="down" />
            <Stat label="Unchanged" value={stats.unc} tone="flat" />
            {stats.topGainer ? (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Top gainer</p>
                <p className="text-sm font-bold text-foreground">
                  {stats.topGainer.symbol}{" "}
                  <span className="text-emerald-600">{formatPct(stats.topGainer.changePct ?? 0)}</span>{" "}
                  <span className="font-semibold text-muted-foreground">{fmtInr(stats.topGainer.price)}</span>
                </p>
              </div>
            ) : null}
            {stats.topLoser ? (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Top loser</p>
                <p className="text-sm font-bold text-foreground">
                  {stats.topLoser.symbol}{" "}
                  <span className="text-rose-600">{formatPct(stats.topLoser.changePct ?? 0)}</span>{" "}
                  <span className="font-semibold text-muted-foreground">{fmtInr(stats.topLoser.price)}</span>
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Sector treemap */}
      {sectors.length > 1 ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Sectors in this index
            </h3>
            {sectorFilter ? (
              <button
                type="button"
                onClick={() => setSectorFilter(null)}
                className="inline-flex items-center gap-1 rounded-full border border-[#1a73e8]/40 bg-[#1a73e8]/10 px-2.5 py-1 text-xs font-bold text-[#1a73e8] hover:bg-[#1a73e8]/20"
              >
                <ListFilter className="size-3" />
                {sectorFilter} · clear
              </button>
            ) : null}
          </div>
          <div className="h-64 w-full sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData}
                dataKey="size"
                nameKey="name"
                content={renderTile}
                isAnimationActive={!reduceMotion}
              >
                <Tooltip content={<SectorTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Tile size = number of stocks, not index weight — free sources publish no weights. Tint = average day change (green up, red down).
          </p>
        </div>
      ) : null}

      {/* Search + table */}
      <div>
        {/* Mobile sticky controls: search + sort. Sticks directly under the
            sticky TopBar (~105px tall on phones); z-30 keeps it below the
            TopBar (z-40). Full-bleed so scrolling cards pass cleanly under it. */}
        <div className="sticky top-[105px] z-30 -mx-3.5 border-b border-border/50 bg-background/95 px-3.5 py-2 backdrop-blur sm:-mx-4 sm:px-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowAll(false);
                }}
                placeholder="Search stocks…"
                className="min-h-[44px] w-full rounded-lg border border-border/80 bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                aria-label="Search constituents"
              />
            </div>
            <select
              value={sortKey}
              onChange={(e) => {
                const key = e.target.value as SortKey;
                if (key !== sortKey) {
                  setSortKey(key);
                  setSortDir(key === "name" ? 1 : -1);
                }
              }}
              aria-label="Sort constituents"
              className="min-h-[44px] shrink-0 rounded-lg border border-border/80 bg-background px-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
            >
              <option value="changePct">Change %</option>
              <option value="price">Price</option>
              <option value="marketCap">Mkt cap</option>
              <option value="name">Name</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === 1 ? -1 : 1))}
              aria-label={sortDir === 1 ? "Sorted ascending — tap for descending" : "Sorted descending — tap for ascending"}
              className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-sm font-bold text-foreground"
            >
              {sortDir === 1 ? "▲" : "▼"}
            </button>
          </div>
        </div>

        {/* Mobile show-all toggle (normal flow, just under the sticky bar) */}
        {isLarge && !query.trim() && !sectorFilter ? (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="mb-2 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-lg border border-border/80 bg-secondary/50 px-3 py-1.5 text-sm font-bold text-foreground hover:bg-secondary md:hidden"
          >
            {showAll ? "Show top 20 movers" : `Show all ${constituents.length}`}
            <ChevronDown className={cn("size-3.5 transition-transform", showAll && "rotate-180")} />
          </button>
        ) : null}

        {/* Desktop search row (unchanged) */}
        <div className="mb-3 hidden flex-wrap items-center gap-2 md:flex">
          <div className="relative min-w-52 flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowAll(false);
              }}
              placeholder="Search by company, symbol or sector…"
              className="w-full rounded-lg border border-border/80 bg-background py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
              aria-label="Search constituents"
            />
          </div>
          {isLarge && !query.trim() && !sectorFilter ? (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-secondary/50 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary"
            >
              {showAll ? "Show top 20 movers" : `Show all ${constituents.length}`}
              <ChevronDown className={cn("size-3.5 transition-transform", showAll && "rotate-180")} />
            </button>
          ) : null}
        </div>

        {!quotesOk ? (
          <p className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700">
            Quotes unavailable — showing list only.
          </p>
        ) : null}

        <div className="hidden overflow-x-auto rounded-lg border border-border/60 md:block">
          <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase text-muted-foreground">
              <tr>
                <Th label="Company" sortKey="name" active={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-2 py-2.5">Sector</th>
                <Th label={priceWord} sortKey="price" active={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                <Th label="Change %" sortKey="changePct" active={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                <th className="px-2 py-2.5 text-right">Day range</th>
                <Th label="Mkt cap (Yahoo)" sortKey="marketCap" active={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {visible.map((c, i) => {
                const up = (c.changePct ?? 0) >= 0;
                const lo = c.dayLow ?? null;
                const hi = c.dayHigh ?? null;
                const span = lo != null && hi != null && hi > lo ? hi - lo : null;
                const pos = c.price != null && span ? Math.min(100, Math.max(0, ((c.price - lo!) / span) * 100)) : null;
                return (
                  <motion.tr
                    key={c.symbol}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-20px" }}
                    transition={{ duration: 0.3, delay: reduceMotion ? 0 : Math.min(i * 0.012, 0.5) }}
                    onClick={() => router.push(`/research/${encodeURIComponent(c.symbol)}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/research/${encodeURIComponent(c.symbol)}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`${c.name} — open full research`}
                    className="cursor-pointer transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1a73e8]"
                  >
                    <td className="px-2 py-2.5">
                      <p className="font-bold text-foreground">{c.symbol}</p>
                      <p className="max-w-[220px] truncate text-muted-foreground">{c.name}</p>
                    </td>
                    <td className="px-2 py-2.5 text-muted-foreground">{c.industry}</td>
                    <td className="px-2 py-2.5 text-right font-bold tabular-nums text-foreground">
                      {c.price != null ? fmtInr(c.price) : "—"}
                    </td>
                    <td className={cn("px-2 py-2.5 text-right font-bold tabular-nums", up ? "text-emerald-600" : "text-rose-600")}>
                      {c.changePct != null ? formatPct(c.changePct) : "—"}
                    </td>
                    <td className="px-2 py-2.5">
                      {lo != null && hi != null ? (
                        <div className="ml-auto w-28">
                          <div className="relative h-1.5 rounded-full bg-secondary/80">
                            {pos != null ? (
                              <span
                                className={cn("absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full", up ? "bg-emerald-500" : "bg-rose-500")}
                                style={{ left: `${pos}%` }}
                              />
                            ) : null}
                          </div>
                          <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
                            {fmtNum(lo, 2)} – {fmtNum(hi, 2)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-foreground">
                      {c.marketCap != null ? fmtCr(c.marketCap / 1e7) : "—"}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards — every desktop column is represented: symbol/name +
            change-% badge in the header; price + sector; day range (with the
            same range bar) + market cap. Whole card opens /research/[symbol],
            the same page the desktop row opens. */}
        <div className="space-y-2 md:hidden">
          {visible.map((c) => {
            const up = (c.changePct ?? 0) >= 0;
            const lo = c.dayLow ?? null;
            const hi = c.dayHigh ?? null;
            const span = lo != null && hi != null && hi > lo ? hi - lo : null;
            const pos =
              c.price != null && span
                ? Math.min(100, Math.max(0, ((c.price - lo!) / span) * 100))
                : null;
            return (
              <button
                key={c.symbol}
                type="button"
                onClick={() => router.push(`/research/${encodeURIComponent(c.symbol)}`)}
                aria-label={`${c.name} — open full research`}
                className="w-full rounded-xl border border-border/60 bg-card p-3 text-left shadow-sm transition-colors active:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">{c.symbol}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.name}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                      up ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600",
                    )}
                  >
                    {c.changePct != null ? formatPct(c.changePct) : "—"}
                  </span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <p className="text-lg font-extrabold tabular-nums text-foreground">
                    {c.price != null ? fmtInr(c.price) : "—"}
                  </p>
                  <p className="max-w-[45%] truncate text-right text-xs text-muted-foreground">
                    {c.industry}
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border/40 pt-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Day range
                    </p>
                    {lo != null && hi != null ? (
                      <>
                        <div className="relative mt-1.5 h-1 rounded-full bg-secondary/80">
                          {pos != null ? (
                            <span
                              className={cn(
                                "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                                up ? "bg-emerald-500" : "bg-rose-500",
                              )}
                              style={{ left: `${pos}%` }}
                            />
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs tabular-nums text-foreground">
                          {fmtNum(lo, 2)} – {fmtNum(hi, 2)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">—</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Mkt cap
                    </p>
                    <p className="mt-1 text-xs font-bold tabular-nums text-foreground">
                      {c.marketCap != null ? fmtCr(c.marketCap / 1e7) : "—"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No constituents match{query.trim() ? ` “${query.trim()}”` : ""}{sectorFilter ? ` in ${sectorFilter}` : ""}.
          </p>
        ) : null}

        {collapsed ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Showing top 20 movers by absolute day change ·{" "}
            <button type="button" onClick={() => setShowAll(true)} className="font-bold text-[#1a73e8] hover:underline">
              show all {constituents.length}
            </button>
          </p>
        ) : null}
      </div>

      {/* Provenance footer */}
      <div className="space-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <p>
          Constituent list: {data?.constituentsSource?.label ?? "index publisher"} · updated{" "}
          {formatDate(data?.constituentsSource?.fetchedAt)}.
        </p>
        {quotesOk && data?.quotesSource ? (
          <p>
            Quotes: {data.quotesSource.provider} · as of {formatDateTime(data.quotesSource.asOf)}
            {!isOpen ? " (market closed — last close prices)" : ""}.
          </p>
        ) : (
          <p>Quotes unavailable — showing list only.</p>
        )}
        {isSensex ? (
          <p>BSE SENSEX list is a pinned snapshot as of Oct 2026 (BSE rebalances semi-annually).</p>
        ) : null}
        <p>Tap any row for the full research page — the same one the homepage search opens.</p>
      </div>
    </motion.section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "up" | "down" | "flat" }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-extrabold tabular-nums",
          tone === "up" ? "text-emerald-600" : tone === "down" ? "text-rose-600" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Th({
  label,
  sortKey,
  active,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: 1 | -1;
  onSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = active === sortKey;
  return (
    <th className={cn("px-2 py-2.5", align === "right" && "text-right")}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 font-bold uppercase hover:text-foreground",
          isActive ? "text-[#1a73e8]" : "text-muted-foreground",
          align === "right" && "flex-row-reverse",
        )}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <span className="text-[10px]">{isActive ? (dir === 1 ? "▲" : "▼") : "△"}</span>
      </button>
    </th>
  );
}
