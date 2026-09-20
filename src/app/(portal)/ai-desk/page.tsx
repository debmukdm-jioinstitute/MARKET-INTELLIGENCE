"use client";

import { AlphaDiscoveryPanel } from "@/components/ai-desk/alpha-discovery-panel";
import { ResourceCard } from "@/components/ai-desk/resource-card";
import { SentimentPortfolioPanel } from "@/components/ai-desk/sentiment-portfolio-panel";
import { TradingDeskPanel } from "@/components/ai-desk/trading-desk-panel";
import { PageHeader, Panel } from "@/components/layout/page-header";

export default function AiDeskPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="AI Desk"
        title="Multi-agent research lab"
        subtitle="Three published multi-agent / LLM-in-finance ideas, re-implemented natively on this app's real live market data and news — powered by a free, open-source LLM (Llama 3.3 70B via Groq). Every result is generated live from real data; nothing here is canned or simulated market data."
      />

      <div className="grid gap-3 md:grid-cols-3">
        <ResourceCard
          title="1. Trading desk (multi-agent debate)"
          tagline="Fundamental, sentiment and technical analysts feed a bull/bear debate; a trader and risk manager turn it into one call."
          paperUrl="https://arxiv.org/abs/2412.20138"
          paperLabel="TradingAgents paper"
          codeUrl="https://github.com/TauricResearch/TradingAgents"
          codeLabel="TauricResearch/TradingAgents"
        />
        <ResourceCard
          title="2. Sentiment-driven portfolio tilt"
          tagline="LLM reads the news for each of your holdings and scores sentiment, which suggests an illustrative allocation tilt."
          paperUrl="https://arxiv.org/abs/2507.18560"
          paperLabel="HARLF paper"
          codeUrl="https://github.com/franjgs/llm-rl-finance-trader"
          codeLabel="llm-rl-finance-trader"
          extraUrl="https://github.com/ProsusAI/finBERT"
          extraLabel="FinBERT"
        />
        <ResourceCard
          title="3. LLM alpha factor discovery"
          tagline="The LLM proposes formulaic alpha factors from a fixed safe vocabulary; this app backtests each one on real price history."
          paperUrl="https://arxiv.org/abs/2409.06289"
          paperLabel="EMNLP 2025 paper"
          codeUrl="https://github.com/kouzhizhuo/Automate-Strategy-Finding-with-LLM-in-Quant-investment"
          codeLabel="Official repo"
        />
      </div>

      <Panel
        title="1. Trading desk — run a live multi-agent debate"
        subtitle="Pick any India (NSE) or US ticker. Real quote, fundamentals, technicals and headlines go to five LLM agents (Llama 3.3 70B via Groq) that debate it."
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
