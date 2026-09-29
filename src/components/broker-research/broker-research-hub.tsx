"use client";

import { useState } from "react";
import {
  CompanyConsensusIntelligence,
  BrokerResearchReport,
  BrokerSourceMeta,
} from "@/lib/broker-research/types";
import { ConsensusIntelligenceView } from "./consensus-intelligence-view";
import { BrokerAggregatorFeed } from "./broker-aggregator-feed";
import {
  Sparkles,
  Layers,
  Building2,
  Search,
  ExternalLink,
  TrendingUp,
  FileText,
} from "lucide-react";

interface Props {
  initialConsensus: CompanyConsensusIntelligence;
  allReports: BrokerResearchReport[];
  sources: BrokerSourceMeta[];
  popularSymbols: readonly { symbol: string; name: string }[] | { symbol: string; name: string }[];
}

export function BrokerResearchHub({
  initialConsensus,
  allReports,
  sources,
  popularSymbols,
}: Props) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialConsensus.symbol);
  const [consensus, setConsensus] = useState<CompanyConsensusIntelligence>(initialConsensus);
  const [activeTab, setActiveTab] = useState<"consensus" | "feed" | "sources">("consensus");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSelectSymbol = async (sym: string) => {
    const s = sym.toUpperCase().trim();
    setSelectedSymbol(s);
    setSearchQuery("");

    setLoading(true);
    try {
      const res = await fetch(`/api/broker-research/consensus?symbol=${encodeURIComponent(s)}`);
      const json = await res.json();
      if (json.consensus) {
        setConsensus(json.consensus);
      }
    } catch (e) {
      console.error("Failed to load consensus", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleSelectSymbol(searchQuery.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Ticker Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/60 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company for consensus intelligence (e.g. RELIANCE, TATAMOTORS, INFY)..."
            className="w-full pl-9 pr-20 py-2 text-xs rounded-lg bg-muted/40 border border-border/60 focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Analyze
          </button>
        </form>

        {/* Quick Tickers */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs text-muted-foreground whitespace-nowrap mr-1">
            Institutional Focus:
          </span>
          {popularSymbols.slice(0, 7).map((item) => {
            const active = item.symbol === selectedSymbol;
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

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("consensus")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
            activeTab === "consensus"
              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Consensus Intelligence & "Why Changed?"</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-inherit tabular-nums">
            {consensus.symbol}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("feed")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
            activeTab === "feed"
              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Broker Research Aggregator Feed</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-inherit tabular-nums">
            {allReports.length} Notes
          </span>
        </button>

        <button
          onClick={() => setActiveTab("sources")}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${
            activeTab === "sources"
              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>11 Monitored Institutional Desks</span>
        </button>
      </div>

      {/* 3. Tab Body */}
      {loading ? (
        <div className="p-12 text-center text-sm text-muted-foreground rounded-xl bg-card border border-border/40">
          Calculating consensus intelligence and model revisions for {selectedSymbol}...
        </div>
      ) : (
        <div>
          {activeTab === "consensus" && (
            <ConsensusIntelligenceView consensus={consensus} />
          )}

          {activeTab === "feed" && (
            <BrokerAggregatorFeed reports={allReports} />
          )}

          {activeTab === "sources" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-card border border-border/60 shadow-sm">
                <h4 className="text-sm font-semibold text-foreground">
                  Monitored Institutional Broker Research Sources (11 Desks)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct ingestion of equity research notes, quarterly previews, model estimates, and analyst recommendations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sources.map((src) => (
                  <div
                    key={src.broker}
                    className="p-4 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition-all shadow-sm space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {src.broker}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums bg-muted/40 px-2 py-0.5 rounded">
                          {src.activeCoverageCount}+ Stocks
                        </span>
                      </div>
                      <span className="text-xs text-primary font-medium block mt-0.5">
                        {src.portalName}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {src.institutionalDeskFocus}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border/40 flex justify-end">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                      >
                        <span>Visit Desk Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
