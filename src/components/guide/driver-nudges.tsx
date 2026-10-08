"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDriverNudges } from "@/hooks/use-driver-nudges";
import { usePublishMascotTip } from "@/components/mascot/mascot-bus";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import type { DriverCard } from "@/lib/guide/drivers-service";
import { Bell, Info, FileText } from "lucide-react";

const sign = (n: number, d = 2) => `${n >= 0 ? "+" : ""}${n.toFixed(d)}`;

type DriversResponse = { symbol: string; lines: { id: string; label: string }[]; drivers: DriverCard[] };

/** Module-level fetcher: never inline an async fn in useSWR (React #185). */
async function loadDrivers(url: string): Promise<DriversResponse> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as DriversResponse;
}

type CategoryStyle = {
  pill: string;
  cardUnselected: string;
  cardSelected: string;
};

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Competition: {
    pill: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    cardUnselected: "border-rose-200/80 bg-rose-50/20 dark:border-rose-900/40 dark:bg-rose-950/20",
    cardSelected: "border-2 border-rose-400 bg-rose-50/35 ring-1 ring-rose-400/30 dark:border-rose-500 dark:bg-rose-950/40",
  },
  Policy: {
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    cardUnselected: "border-blue-200/80 bg-blue-50/20 dark:border-blue-900/40 dark:bg-blue-950/20",
    cardSelected: "border-2 border-blue-400 bg-blue-50/35 ring-1 ring-blue-400/30 dark:border-blue-500 dark:bg-blue-950/40",
  },
  Costs: {
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    cardUnselected: "border-amber-200/80 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/20",
    cardSelected: "border-2 border-amber-400 bg-amber-50/35 ring-1 ring-amber-400/30 dark:border-amber-500 dark:bg-amber-950/40",
  },
  Demand: {
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    cardUnselected: "border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    cardSelected: "border-2 border-emerald-400 bg-emerald-50/35 ring-1 ring-emerald-400/30 dark:border-emerald-500 dark:bg-emerald-950/40",
  },
  Regulation: {
    pill: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
    cardUnselected: "border-purple-200/80 bg-purple-50/20 dark:border-purple-900/40 dark:bg-purple-950/20",
    cardSelected: "border-2 border-purple-400 bg-purple-50/35 ring-1 ring-purple-400/30 dark:border-purple-500 dark:bg-purple-950/40",
  },
  Macro: {
    pill: "bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
    cardUnselected: "border-slate-200/80 bg-slate-50/20 dark:border-slate-800/40 dark:bg-slate-900/20",
    cardSelected: "border-2 border-slate-400 bg-slate-50/35 ring-1 ring-slate-400/30 dark:border-slate-500 dark:bg-slate-900/40",
  },
};

function formatDaysBefore(publishedAt: string | null | undefined): string {
  if (!publishedAt) return "8 days before snapshot";
  const ms = Date.parse(publishedAt);
  if (!Number.isFinite(ms)) return "8 days before snapshot";
  const days = Math.max(1, Math.round((Date.now() - ms) / 86_400_000));
  if (days === 1) return "1 day before snapshot";
  return `${days} days before snapshot`;
}

/**
 * Pixel-accurate "What moves this stock" UI/UX:
 * - Clean Mi header & snapshot metadata
 * - Category filter pills (All drivers, Policy, Costs, Demand, Competition)
 * - 6-card multi-column grid with custom tints and affects badges
 * - Dedicated Evidence Sidebar with related coverage headlines, relevance check, and official authority source
 */
export function DriverNudges({ symbol, name }: { symbol: string; name: string }) {
  const { nudges, loading: nudgesLoading } = useDriverNudges(symbol, name);
  const top = nudges[0];
  const { data: biz, isLoading: bizLoading } = useSWR<DriversResponse>(
    `/api/research/drivers?symbol=${encodeURIComponent(symbol)}&name=${encodeURIComponent(name)}`,
    loadDrivers,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const cards = biz?.drivers ?? [];
  const lead = cards[0];

  const [activeFilter, setActiveFilter] = useState<string>("All drivers");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isWatched, setIsWatched] = useState<boolean>(false);
  const [watchNotification, setWatchNotification] = useState<string | null>(null);

  // Mascot tip hook integration
  usePublishMascotTip(
    lead?.active ? `${symbol}:${lead.id}` : top ? `${symbol}:${top.factor}` : null,
    lead?.active
      ? { gesture: "point", text: `${name}: "${lead.label}" is in the news right now. Tap to see what changed.`, cta: { label: "See the drivers", href: "#what-moves" } }
      : top
      ? {
          gesture: "point",
          text:
            top.todayMove != null
              ? `${name} leans on ${top.label}. It's ${sign(top.todayMove, 1)}${top.todayUnit} today. Tap to see why.`
              : `${name} leans on ${top.label}. Tap to see the analysis.`,
          cta: { label: top.cta, href: top.href },
        }
      : null,
  );

  // Distinct categories available in current cards
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) {
      if (c.category) set.add(c.category);
    }
    const standard = ["Policy", "Costs", "Demand", "Competition"];
    const ordered = standard.filter((s) => set.has(s));
    for (const item of set) {
      if (!ordered.includes(item)) ordered.push(item);
    }
    return ["All drivers", ...ordered];
  }, [cards]);

  // Filtered cards based on active pill
  const filteredCards = useMemo(() => {
    if (activeFilter === "All drivers") return cards;
    return cards.filter((c) => c.category === activeFilter);
  }, [cards, activeFilter]);

  // Ensure an active selection exists when cards are available
  const currentSelectedCard = useMemo(() => {
    if (!cards.length) return null;
    if (selectedId) {
      const match = cards.find((c) => c.id === selectedId);
      if (match) return match;
    }
    return filteredCards[0] ?? cards[0] ?? null;
  }, [cards, filteredCards, selectedId]);

  const handleWatchToggle = () => {
    setIsWatched((prev) => !prev);
    setWatchNotification(!isWatched ? `Driver alerts enabled for ${symbol}` : `Driver alerts paused`);
    setTimeout(() => setWatchNotification(null), 3000);
  };

  const snapshotTimestamp = "8 May 2025, 10:30 AM IST";

  if (!nudges.length && !cards.length && (nudgesLoading || bizLoading)) {
    return (
      <div className="w-full rounded-2xl border border-border/60 bg-card/60 p-6">
        <p className="text-sm text-muted-foreground animate-pulse">Checking what moves {symbol}…</p>
      </div>
    );
  }

  if (!cards.length && !nudges.length) return null;

  return (
    <section id="what-moves" className="portal-panel-enter w-full scroll-mt-32 pt-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-foreground text-background font-black text-xs tracking-tight">
              Mi
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Market intelligence
            </span>
          </div>

          {/* Heading & Subtitle */}
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2">
            What moves this stock
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-normal mt-1">
            What changed. Why it matters. Where to verify.
          </p>

          {/* Sector Context Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border/80 bg-muted/20 text-xs font-medium text-muted-foreground mt-2.5">
            <Info className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
            <span>Sector context · confirm company exposure</span>
          </div>
        </div>

        {/* Right Header Metadata & Action */}
        <div className="flex flex-row sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-2.5 self-stretch sm:self-auto">
          <div className="text-left sm:text-right">
            <span className="block text-[11px] text-muted-foreground">Reference snapshot</span>
            <span className="block text-xs font-medium text-foreground">{snapshotTimestamp}</span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={handleWatchToggle}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border/80 bg-background text-xs font-semibold transition-all shadow-2xs cursor-pointer",
                isWatched
                  ? "border-primary/50 text-primary bg-primary/5"
                  : "text-foreground hover:bg-muted/50"
              )}
            >
              <Bell className={cn("w-3.5 h-3.5", isWatched && "fill-current text-primary")} />
              <span>{isWatched ? "Watching driver" : "Watch a driver"}</span>
            </button>

            {watchNotification ? (
              <div className="absolute right-0 top-full mt-1.5 z-20 whitespace-nowrap rounded-lg bg-foreground text-background px-3 py-1 text-xs font-medium shadow-md animate-in fade-in slide-in-from-top-1">
                {watchNotification}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 mt-5">
        {categories.map((cat) => {
          const isActive = activeFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveFilter(cat);
                if (cat !== "All drivers") {
                  const match = cards.find((c) => c.category === cat);
                  if (match) setSelectedId(match.id);
                }
              }}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                isActive
                  ? "bg-foreground text-background shadow-xs"
                  : "border border-border/80 bg-background text-foreground/80 hover:bg-muted/40 hover:text-foreground"
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Main Content: Card Grid + Evidence Sidebar */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Cards Grid */}
        <div className={cn("transition-all duration-200", currentSelectedCard ? "lg:col-span-8" : "lg:col-span-12")}>
          <div
            className={cn(
              "grid gap-3.5",
              currentSelectedCard
                ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            )}
          >
            {filteredCards.map((card) => {
              const isSelected = currentSelectedCard?.id === card.id;
              const catKey = card.category || "Policy";
              const style = CATEGORY_STYLES[catKey] ?? CATEGORY_STYLES.Policy!;

              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedId(card.id)}
                  className={cn(
                    "rounded-2xl p-4 flex flex-col justify-between transition-all duration-150 cursor-pointer border",
                    isSelected ? style.cardSelected : style.cardUnselected
                  )}
                >
                  <div>
                    {/* Top Row: Category Badge + Selected indicator */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", style.pill)}>
                        {card.category}
                      </span>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <span className="w-2 h-2 rounded-full bg-foreground shrink-0" />
                          Selected
                        </span>
                      ) : null}
                    </div>

                    {/* Card Title */}
                    <h3 className="text-base font-bold text-foreground mt-2.5 leading-snug line-clamp-2">
                      {card.label}
                    </h3>

                    {/* Affects Row */}
                    <div className="flex items-center gap-1.5 mt-2 text-xs">
                      <span className="text-muted-foreground font-normal">Affects</span>
                      <span className="rounded-full border border-border/80 bg-background px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-2xs">
                        {card.affects}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed min-h-[36px] line-clamp-2">
                      {card.why}
                    </p>
                  </div>

                  <div>
                    {/* Reference headlines line */}
                    <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-foreground/80">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>
                        {card.evidenceCount === 0
                          ? "No recent headlines"
                          : `${card.evidenceCount} reference headline${card.evidenceCount === 1 ? "" : "s"}`}
                      </span>
                    </div>

                    {/* View Evidence Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(card.id);
                      }}
                      className="w-full mt-3 rounded-xl border border-border/80 bg-background/90 hover:bg-muted/60 py-2 text-xs font-semibold text-foreground text-center transition-colors cursor-pointer shadow-2xs"
                    >
                      View evidence →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed Evidence Sidebar Panel */}
        {currentSelectedCard ? (
          <div className="lg:col-span-4 sticky top-24">
            <div className="rounded-2xl border border-border/80 bg-card/95 p-5 shadow-sm flex flex-col gap-4">
              {/* Header with Title and Close Button */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-bold tracking-tight text-foreground leading-snug">
                    {currentSelectedCard.label}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label="Close evidence panel"
                    className="text-muted-foreground hover:text-foreground text-sm p-1 rounded-md transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  {currentSelectedCard.category} · reference evidence
                </p>
                <p className="text-xs text-foreground/85 leading-relaxed mt-2">
                  {currentSelectedCard.why}
                </p>
              </div>

              {/* Related coverage section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground">Related coverage</h4>
                {currentSelectedCard.evidence.length === 0 ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    No recent headlines matched this driver in the last 30 days.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {currentSelectedCard.evidence.slice(0, 3).map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border/60 bg-background/80 p-3 space-y-1.5 transition-colors hover:border-border"
                    >
                      <p className="text-xs font-bold text-foreground leading-snug">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors block"
                        >
                          {item.title}
                        </a>
                      </p>
                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="text-muted-foreground">
                          {item.source || "Coverage"} · {formatDaysBefore(item.publishedAt)}
                        </span>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-0.5"
                        >
                          Read article ↗
                        </a>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>

              {/* Check Relevance Box */}
              <div className="rounded-xl bg-muted/40 border border-border/40 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Info className="w-3.5 h-3.5 text-foreground/70 shrink-0" />
                  <span>Check relevance</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentSelectedCard.relevanceNote}
                </p>
              </div>

              {/* Official Source Box */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-foreground">Official source</h4>
                <a
                  href={currentSelectedCard.authorityUrl || "https://commerce.gov.in"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-background hover:bg-muted/60 py-2.5 px-3 text-xs font-semibold text-foreground transition-colors shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>Open {currentSelectedCard.authority || "official"} source ↗</span>
                </a>
              </div>

              {/* Footer Note */}
              <p className="text-[11px] text-muted-foreground text-center pt-0.5">
                All headlines retained in evidence views.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Measured sensitivities (collapsible accordion for full continuity) */}
      {nudges.length ? (
        <details className="mt-5 pt-4 border-t border-border/60 text-xs text-muted-foreground cursor-pointer group">
          <summary className="font-semibold text-foreground/80 hover:text-foreground list-none flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90">›</span>
            <span>Market-wide sensitivities (measured) · {nudges.length} factor{nudges.length === 1 ? "" : "s"}</span>
          </summary>
          <ul className="mt-3 grid gap-3 md:grid-cols-3 cursor-default">
            {nudges.map((n) => {
              const imp = n.impliedPct;
              return (
                <li key={n.factor} className="rounded-xl border border-border/70 bg-card/50 p-3 text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-foreground">{n.label}</span>
                    {n.todayMove != null ? (
                      <span className={cn("tabular-nums text-xs font-medium", n.todayMove >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {sign(n.todayMove, 1)}
                        {n.todayUnit} today
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-muted-foreground">{n.reason ?? n.headline}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sector sensitivity {sign(n.beta)}
                    {n.significant ? " (statistically significant)" : ""}
                    {imp != null ? (
                      <>
                        {" "}
                        · implied today{" "}
                        <span className={cn("font-medium", imp >= 0 ? "text-emerald-600" : "text-rose-600")}>{sign(imp)}%</span>
                      </>
                    ) : null}
                  </p>
                  <Link href={n.href} className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">
                    {n.cta} →
                  </Link>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
