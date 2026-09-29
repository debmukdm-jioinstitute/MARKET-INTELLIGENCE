"use client";

import { useState, useEffect } from "react";
import { CompanyIntelligenceProfile } from "@/lib/company-intelligence/types";
import { CompanyTimelineView } from "./company-timeline-view";
import { WhatChangedView } from "./what-changed-view";
import { ConcallIntelligenceView } from "./concall-intelligence-view";
import { IrCrawlerView } from "./ir-crawler-view";
import {
  Building2,
  Calendar,
  Sparkles,
  Headphones,
  FolderTree,
  Search,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface Props {
  initialProfile: CompanyIntelligenceProfile;
  featuredSymbols: { symbol: string; name: string; sector: string }[];
  initialSymbol?: string;
}

export function CompanyIntelligenceHub({
  initialProfile,
  featuredSymbols,
  initialSymbol,
}: Props) {
  const [symbol, setSymbol] = useState<string>(initialSymbol || initialProfile.symbol);
  const [profile, setProfile] = useState<CompanyIntelligenceProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<"timeline" | "what-changed" | "concall" | "ir-crawler">("timeline");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch updated profile when symbol changes
  useEffect(() => {
    if (symbol === initialProfile.symbol && profile.symbol === symbol) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/company/intelligence?symbol=${encodeURIComponent(symbol)}`);
        const json = await res.json();
        if (!cancelled && json.profile) {
          setProfile(json.profile);
        }
      } catch (err) {
        console.error("Failed to load company profile", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [symbol, initialProfile.symbol, profile.symbol]);

  const handleSelectSymbol = (s: string) => {
    setSymbol(s.toUpperCase());
    setSearchQuery("");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleSelectSymbol(searchQuery.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Ticker Switcher & Quick Pills */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/60 shadow-sm">
        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any listed ticker (e.g. TATAMOTORS, INFY, RELIANCE)..."
            className="w-full pl-9 pr-20 py-2 text-xs rounded-lg bg-muted/40 border border-border/60 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Analyze
          </button>
        </form>

        {/* Featured Bellwether Tickers */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs text-muted-foreground whitespace-nowrap mr-1">
            Flagship Coverage:
          </span>
          {featuredSymbols.map((item) => {
            const active = item.symbol === symbol;
            return (
              <button
                key={item.symbol}
                onClick={() => handleSelectSymbol(item.symbol)}
                className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.symbol}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Company Profile Meta Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-card via-card to-primary/5 border border-border/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {profile.companyName}
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {profile.symbol}
              </span>
              <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                {profile.sector}
              </span>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Market Cap Tier: <strong className="text-foreground">{profile.marketCapTier}</strong></span>
              <span>•</span>
              <span>Latest Concall Stance: <strong className="text-primary">{profile.latestConcall.dimensions.managementConfidence.stance}</strong></span>
            </p>
          </div>

          {/* Quick Action Links */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/research/${encodeURIComponent(profile.symbol)}`}
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              <span>Full Research Dossier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a
              href={profile.irBaseUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <span>Investor Relations</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Intelligence Mode Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/40 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === "timeline"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Company Intelligence Timeline</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-inherit tabular-nums">
              {profile.timeline.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("what-changed")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === "what-changed"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI "What Changed?"</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
              Delta
            </span>
          </button>

          <button
            onClick={() => setActiveTab("concall")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === "concall"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Concall Intelligence & Tone Tracker</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-inherit tabular-nums">
              {profile.historicalToneTrajectory.length}Q
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ir-crawler")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === "ir-crawler"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>IR Crawler Hierarchy</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-inherit tabular-nums">
              {profile.irDocuments.length} files
            </span>
          </button>
        </div>
      </div>

      {/* 3. Main Display Body */}
      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground rounded-xl bg-card border border-border/40">
          Loading comprehensive intelligence for {symbol}...
        </div>
      ) : (
        <div>
          {activeTab === "timeline" && (
            <CompanyTimelineView
              events={profile.timeline}
              companyName={profile.companyName}
              symbol={profile.symbol}
            />
          )}

          {activeTab === "what-changed" && (
            <WhatChangedView
              whatChanged={profile.whatChanged}
              companyName={profile.companyName}
              symbol={profile.symbol}
            />
          )}

          {activeTab === "concall" && (
            <ConcallIntelligenceView
              concall={profile.latestConcall}
              historicalTone={profile.historicalToneTrajectory}
              companyName={profile.companyName}
              symbol={profile.symbol}
            />
          )}

          {activeTab === "ir-crawler" && (
            <IrCrawlerView
              documents={profile.irDocuments}
              companyName={profile.companyName}
              symbol={profile.symbol}
              irBaseUrl={profile.irBaseUrl}
            />
          )}
        </div>
      )}
    </div>
  );
}
