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

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-400">
                Top Social Buzz:
              </span>
              <div className="flex gap-1 text-muted-foreground">
                {initialData.overallMarketSentiment.mostHypedTickers.map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => {
                        handleSelectSymbol(t);
                        setActiveTab("sentiment");
                      }}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      {t}
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-400">
                Retail Capitulation:
              </span>
              <div className="flex gap-1 text-muted-foreground">
                {initialData.overallMarketSentiment.mostHatedTickers.map(
                  (t) => (
                    <button
                      key={t}
                      onClick={() => {
                        handleSelectSymbol(t);
                        setActiveTab("sentiment");
                      }}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      {t}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Tab Selectors */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/40 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("sentiment")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "sentiment"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Company Retail Sentiment Engine</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-inherit tabular-nums">
              {currentSentiment.symbol}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("problems")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "problems"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Investor Problems Radar (Alternative Insights)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
              {initialData.investorProblems.length} Themes
            </span>
          </button>

          <button
            onClick={() => setActiveTab("communities")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === "communities"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Monitored Communities (10 Subreddits)</span>
          </button>
        </div>
      </div>

      {/* 2. Ticker Selector Bar with Upstox Dropdown (Visible on Sentiment tab) */}
      {activeTab === "sentiment" && (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-card border border-border/60 shadow-sm">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Integrated Upstox Stock Search Dropdown */}
            <RedditStockSearch
              selectedSymbol={selectedSymbol}
              onSelectStock={handleSelectSymbol}
            />

            <div className="text-right shrink-0">
              <span className="text-[11px] text-muted-foreground">
                Currently Inspecting:
              </span>
              <div className="text-xs font-semibold text-foreground">
                {currentSentiment.companyName} ({currentSentiment.symbol})
              </div>
            </div>
          </div>

          {/* Quick-select Buzz Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-border/30 scrollbar-none">
            <span className="text-xs text-muted-foreground whitespace-nowrap mr-1 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              High Retail Buzz:
            </span>
            {topBuzzSymbols.map((sym) => {
              const active = sym === selectedSymbol;
              return (
                <button
                  key={sym}
                  onClick={() => handleSelectSymbol(sym)}
                  className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
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
