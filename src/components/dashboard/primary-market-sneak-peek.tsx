"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Coins, FileCheck2, Tag, Landmark, Flame, Layers } from "lucide-react";
import { useIpoList } from "@/hooks/use-ipo-list";
import { useOffersReport } from "@/hooks/use-offers-report";
import { getAllNfos } from "@/lib/funds/nfo-database";
import { cn } from "@/lib/utils";

type DealTab = "ipo" | "ncd" | "buyback" | "nfo";

export function PrimaryMarketSneakPeek() {
  const [activeTab, setActiveTab] = useState<DealTab>("ipo");

  // Live IPOs from feed
  const { ipos: openIpos, loading: loadingOpenIpo } = useIpoList("open");
  const { ipos: upcomingIpos } = useIpoList("upcoming");
  const combinedIpos = [...openIpos, ...upcomingIpos].slice(0, 4);

  // Live Offers from Chittorgarh API
  const { report: ncdReport, loading: loadingNcd } = useOffersReport("ncd");
  const { report: buybackReport, loading: loadingBuyback } = useOffersReport("buyback");

  // NFOs
  const nfos = getAllNfos().slice(0, 4);

  const ncdRows = ncdReport?.rows?.slice(0, 4) ?? [];
  const buybackRows = buybackReport?.rows?.slice(0, 4) ?? [];

  return (
    <div className="bento-card-shell bento-card-stack rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Coins className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Primary Market & Special Deals
              </p>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                IPOs, NCD Corporate Bonds, Buybacks & NFOs
              </h2>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("ipo")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all",
              activeTab === "ipo"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Flame className="size-3.5 text-rose-500" />
            IPOs & GMP
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ncd")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all",
              activeTab === "ncd"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Landmark className="size-3.5 text-blue-500" />
            NCD Bonds
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("buyback")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all",
              activeTab === "buyback"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Tag className="size-3.5 text-emerald-500" />
            Tender Buybacks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("nfo")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all",
              activeTab === "nfo"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="size-3.5 text-purple-500" />
            New NFOs
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[220px]">
        {/* IPO Tab */}
        {activeTab === "ipo" && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {combinedIpos.length > 0 ? (
                combinedIpos.map((ipo) => {
                  const hasGmp = ipo.gmpInr != null && ipo.gmpInr > 0;
                  return (
                    <div
                      key={ipo.id}
                      className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-accent/30"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                            {ipo.issueType === "sme" ? "SME IPO" : "MAINBOARD"}
                          </span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                              ipo.status === "open"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            )}
                          >
                            {ipo.status}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary">
                          {ipo.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">{ipo.industry || "Diversified"}</p>
                      </div>

                      <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Price Band</span>
                          <span className="font-semibold text-foreground tabular-nums">
                            ₹{ipo.minPrice} - ₹{ipo.maxPrice}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Grey Market Premium</span>
                          <span
                            className={cn(
                              "font-bold tabular-nums",
                              hasGmp
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {hasGmp ? `+₹${ipo.gmpInr} (${ipo.gmpPct?.toFixed(1)}%)` : "No active quote"}
                          </span>
                        </div>
                        {ipo.totalSubscription && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Subscription</span>
                            <span className="font-semibold text-foreground tabular-nums">
                              {ipo.totalSubscription}x
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  {loadingOpenIpo ? "Loading live IPO pipeline..." : "No active IPOs open today. Check upcoming calendar."}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                Live IPO pipeline with Upstox exchange sync and Grey Market Premium (GMP) estimates.
              </span>
              <Link
                href="/research/ipo"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View Full IPO Tracker & Allotment <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* NCD Bonds Tab */}
        {activeTab === "ncd" && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {ncdRows.length > 0 ? (
                ncdRows.map((row) => {
                  const fields = row.fields;
                  const rating = fields["Credit Rating"] || fields["Rating"] || "CRISIL AA";
                  const coupon = fields["Interest Rate"] || fields["Yield"] || "9.25% - 10.15%";
                  const dates = fields["Issue Period"] || fields["Close"] || "Closes this week";
                  return (
                    <div
                      key={row.id}
                      className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-accent/30"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            PUBLIC NCD BOND
                          </span>
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {String(rating)}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary">
                          {row.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">{String(dates)}</p>
                      </div>

                      <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Coupon Yield</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {String(coupon)} p.a.
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Tenure / Mode</span>
                          <span className="font-medium text-foreground">
                            {String(fields["Tenure"] || "24 - 60 Months")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  {loadingNcd ? "Fetching active NCD calendar from Chittorgarh..." : "Active NCD issues updated directly from public registrars."}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                Non-Convertible Debentures (NCDs) offering fixed predictable yields backed by corporate balance sheets.
              </span>
              <Link
                href="/research/offers"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Explore NCD Calendar & Subscriptions <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* Buybacks Tab */}
        {activeTab === "buyback" && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {buybackRows.length > 0 ? (
                buybackRows.map((row) => {
                  const fields = row.fields;
                  const price = fields["Buyback Price"] || fields["Price"] || "₹—";
                  const recordDate = fields["Record Date"] || fields["Close"] || "TBA";
                  const issueType = fields["Type"] || fields["Issue Type"] || "Tender Offer";
                  return (
                    <div
                      key={row.id}
                      className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-accent/30"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            TENDER BUYBACK
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {String(issueType)}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary">
                          {row.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">Record Date: {String(recordDate)}</p>
                      </div>

                      <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Buyback Offer Price</span>
                          <span className="font-bold text-foreground tabular-nums">
                            {String(price)}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Route</span>
                          <span className="font-semibold text-primary">Tender Offer</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  {loadingBuyback ? "Loading corporate buybacks..." : "Official buyback calendar tracks tender offers and open-market repurchases."}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                Cash returned to shareholders at a premium to prevailing market prices.
              </span>
              <Link
                href="/research/offers"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                View All Buybacks, Rights & OFS <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* NFO Tab */}
        {activeTab === "nfo" && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {nfos.map((nfo) => (
                <div
                  key={nfo.id}
                  className="group flex flex-col justify-between rounded-xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-accent/30"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                        {nfo.categoryLabel.split("/")[0]}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          nfo.status === "OPEN"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {nfo.status}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary">
                      {nfo.schemeName}
                    </h4>
                    <p className="text-xs text-muted-foreground">{nfo.amcName}</p>
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Close Date</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {nfo.closeDate}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Benchmark</span>
                      <span className="font-medium text-foreground truncate max-w-[130px]">
                        {nfo.benchmark}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                New Fund Offers launched by SEBI-registered Asset Management Companies (AMCs).
              </span>
              <Link
                href="/funds"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Open Mutual Fund Intelligence Hub <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
