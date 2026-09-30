"use client";

import { useState } from "react";
import {
  RetailSentimentHubData,
  CompanyRetailSentiment,
} from "@/lib/reddit-sentiment/types";
import { RetailSentimentEngineView } from "./retail-sentiment-engine-view";
import { InvestorProblemsRadarView } from "./investor-problems-radar-view";
import { RedditStockSearch } from "./reddit-stock-search";
import {
  Flame,
  ExternalLink,
  Users,
  HelpCircle,
  BarChart2,
} from "lucide-react";

interface Props {
  initialData: RetailSentimentHubData;
  initialSymbol?: string;
}

export function RetailSentimentHub({ initialData, initialSymbol }: Props) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    initialSymbol?.toUpperCase() || "RELIANCE"
  );
  const [activeTab, setActiveTab] = useState<
    "sentiment" | "problems" | "communities"
  >("sentiment");
  const [currentSentiment, setCurrentSentiment] =
    useState<CompanyRetailSentiment>(
      initialData.companies.find(
        (c) => c.symbol === (initialSymbol?.toUpperCase() || "RELIANCE")
      ) || initialData.companies[0]
    );
  const [loading, setLoading] = useState<boolean>(false);

  const handleSelectSymbol = async (sym: string, companyName?: string) => {
    const s = sym.toUpperCase().trim();
    setSelectedSymbol(s);

    // Sync URL parameter without page reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("symbol", s);
      window.history.replaceState({}, "", url.toString());
    }

    // Check if in initial list with verified active data
    const found = initialData.companies.find((c) => c.symbol === s);
    if (found && found.dataStatus === "VERIFIED_ACTIVE") {
      setCurrentSentiment(found);
      return;
    }

    // Fetch from API
    setLoading(true);
    try {
      const q = `/api/reddit/sentiment?symbol=${encodeURIComponent(s)}${
        companyName ? `&name=${encodeURIComponent(companyName)}` : ""
      }`;
      const res = await fetch(q);
      const json = await res.json();
      if (json.companySentiment) {
        setCurrentSentiment(json.companySentiment);
      } else if (found) {
        setCurrentSentiment(found);
      }
    } catch (e) {
      console.error("Failed to load sentiment", e);
      if (found) setCurrentSentiment(found);
    } finally {
      setLoading(false);
    }
  };

  // Top buzzing equities to highlight in quick pills
  const topBuzzSymbols = [
    "RELIANCE",
    "TATAMOTORS",
    "SUZLON",
    "ZOMATO",
    "HDFCBANK",
    "PAYTM",
    "INFY",
    "TCS",
    "ITC",
    "SBIN",
    "IRFC",
    "RVNL",
    "IREDA",
    "YESBANK",
    "CDSL",
    "ANGELONE",
    "TRENT",
    "ADANIENT",
    "HAL",
    "BEL",
    "BSE",
    "VEDL",
    "TATAPOWER",
    "JIOFIN",
  ];

  return (
    <div className="space-y-6">
      {/* 1. Overall Market Retail Sentiment Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-card via-card to-primary/5 border border-border/60 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Retail Alternative Sentiment Engine
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  Reddit NLP Feed
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monitoring 10 major Indian & global financial subreddits for retail positioning, hype cycles, and unmet investor problems.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">
                Retail Euphoria Meter
              </span>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-base font-bold text-primary tabular-nums">
                  {initialData.overallMarketSentiment.retailEuphoriaScore}
                  <span className="text-xs font-normal text-muted-foreground">
                    /100
                  </span>
                </span>
                <span className="text-xs font-medium text-emerald-400">
                  Moderately Bullish
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FII vs Retail Divergence & Most Hyped/Hated Chips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="md:col-span-2 p-3 rounded-lg bg-muted/20 border border-border/40">
            <span className="font-semibold text-foreground mr-1.5">
              FII/DII vs Retail Divergence:
            </span>
            <span className="text-muted-foreground leading-relaxed">
              {initialData.overallMarketSentiment.fiiDiiVsRetailDivergence}
            </span>
          </div>

          <div className="space-y-2 rounded-lg border border-border/40 bg-muted/20 p-3 text-xs">
            <div>
              <span className="mr-1.5 font-semibold text-[11px] text-emerald-600 dark:text-emerald-400">
                Top Social Buzz
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {initialData.overallMarketSentiment.mostHypedTickers.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      handleSelectSymbol(t);
                      setActiveTab("sentiment");
                    }}
                    className="cursor-pointer rounded-md border border-border/50 bg-card px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mr-1.5 font-semibold text-[11px] text-rose-600 dark:text-rose-400">
                Retail Capitulation
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {initialData.overallMarketSentiment.mostHatedTickers.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      handleSelectSymbol(t);
                      setActiveTab("sentiment");
                    }}
                    className="cursor-pointer rounded-md border border-border/50 bg-card px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="mt-1 flex flex-wrap gap-1 border-t border-border/40 pt-3"
          role="tablist"
          aria-label="Reddit intelligence views"
        >
          <div className="flex flex-wrap gap-1 rounded-xl bg-muted/25 p-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "sentiment"}
            onClick={() => setActiveTab("sentiment")}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              activeTab === "sentiment"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">Company sentiment</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
                activeTab === "sentiment"
                  ? "bg-primary/10 font-semibold text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {currentSentiment.symbol}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "problems"}
            onClick={() => setActiveTab("problems")}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              activeTab === "problems"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">Problems radar</span>
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              {initialData.investorProblems.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "communities"}
            onClick={() => setActiveTab("communities")}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              activeTab === "communities"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">Communities</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">10</span>
          </button>
          </div>
        </div>
      </div>

      {/* 2. Ticker Selector Bar with Upstox Dropdown (Visible on Sentiment tab) */}
      {activeTab === "sentiment" && (
        <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <RedditStockSearch
              className="lg:max-w-2xl lg:flex-1"
              selectedSymbol={selectedSymbol}
              onSelectStock={handleSelectSymbol}
            />

            <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 lg:text-right">
              <span className="block text-[11px] text-muted-foreground">
                Currently inspecting
              </span>
              <div className="text-sm font-semibold text-foreground">
                {currentSentiment.companyName}
              </div>
              <div className="text-xs font-medium text-primary tabular-nums">
                {currentSentiment.symbol}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/30 pt-3">
            <span className="mr-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden />
              High retail buzz
            </span>
            {topBuzzSymbols.map((sym) => {
              const active = sym === selectedSymbol;
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleSelectSymbol(sym)}
                  className={`cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-xs transition-colors ${
                    active
                      ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                      : "border border-border/50 bg-muted/30 text-foreground hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  {sym}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Main Tab Content */}
      {activeTab === "sentiment" && (
        <div>
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground rounded-xl bg-card border border-border/40 flex flex-col items-center justify-center gap-2">
              <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span>Analyzing community sentiment for {selectedSymbol}...</span>
            </div>
          ) : (
            <RetailSentimentEngineView sentiment={currentSentiment} />
          )}
        </div>
      )}

      {activeTab === "problems" && (
        <InvestorProblemsRadarView problems={initialData.investorProblems} />
      )}

      {activeTab === "communities" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm">
            <h4 className="text-sm font-semibold text-foreground">
              Monitored Financial Subreddits Matrix
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Continuously scanned for ticker co-occurrences, retail positioning, sentiment shift spikes, and retail investor questions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialData.trackedSubreddits.map((sub) => (
              <div
                key={sub.id}
                className="p-4 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition-all shadow-sm space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-primary">
                      {sub.id}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums bg-muted/40 px-2 py-0.5 rounded">
                      {sub.memberCount} members
                    </span>
                  </div>

                  <h5 className="text-xs font-semibold text-foreground mt-1">
                    {sub.name} ({sub.geoFocus} Focus)
                  </h5>

                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {sub.focusArea}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/40 flex justify-end">
                  <a
                    href={sub.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                  >
                    <span>Visit Community</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
