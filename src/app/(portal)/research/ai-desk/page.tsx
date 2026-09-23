"use client";

import { AlphaDiscoveryPanel } from "@/components/ai-desk/alpha-discovery-panel";
import { SentimentPortfolioPanel } from "@/components/ai-desk/sentiment-portfolio-panel";
import { TradingDeskPanel } from "@/components/ai-desk/trading-desk-panel";
import { PageHeader, Panel } from "@/components/layout/page-header";

export default function AiDeskPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="AI Desk"
        title="Multi-agent research lab"
      />

      <Panel
        title="1. Trading desk — run a live multi-agent debate"
        subtitle="Pick any India (NSE) or US ticker. Real quote, fundamentals, technicals and headlines go to five LLM agents (GPT-OSS 120B via Groq) that debate it."
      >
        <TradingDeskPanel />
      </Panel>

      <Panel
        title="2. Sentiment portfolio tilt"
        subtitle="Scores real recent headlines for each of your My Portfolio holdings."
      >
        <SentimentPortfolioPanel />
      </Panel>

      <Panel
        title="3. Alpha factor discovery"
        subtitle="Pick 1-8 tickers. The LLM proposes candidate factors; this app backtests them on real historical prices."
      >
        <AlphaDiscoveryPanel />
      </Panel>
    </div>
  );
}
