import { ResearchHomeClient } from "@/app/(portal)/research/research-home-client";
import { BrokerResearchHub } from "@/components/broker-research/broker-research-hub";
import { EarningsCalendarCard } from "@/components/dashboard/earnings-calendar-card";
import {
  getCompanyConsensusIntelligence,
  getAllBrokerResearchReports,
  INSTITUTIONAL_BROKER_SOURCES,
} from "@/lib/broker-research/database";
import { pageMetadata } from "@/lib/seo/metadata";
import { RESEARCH_HUB_SYMBOLS } from "@/lib/seo/popular-symbols";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Broker Research Aggregator & Consensus Intelligence",
  description:
    "Institutional equity research across 11 top brokers (Motilal Oswal, Kotak, ICICI Sec, HDFC Sec, etc.), target prices, financial estimates, and AI Consensus Changed — Why? synthesis.",
  path: "/research",
});

export default function ResearchPage() {
  const initialConsensus = getCompanyConsensusIntelligence("RELIANCE");
  const allReports = getAllBrokerResearchReports();
  const sources = INSTITUTIONAL_BROKER_SOURCES;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:py-12 space-y-12">
      {/* 1. Page Header & Hero Search */}
      <div className="space-y-6">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.28em] font-semibold text-[#1a73e8]">
            Institutional Research & Consensus
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl text-foreground">
            Broker Research Aggregator & Consensus Intelligence
          </h1>
          <p className="mx-auto mt-3 text-sm text-muted-foreground leading-relaxed">
            Consensus target prices, financial model estimates (Revenue, EBITDA, EPS), and AI-synthesized{" "}
            <span className="font-semibold text-foreground">&ldquo;Why Consensus Changed&rdquo;</span>{" "}
            across 11 leading Indian institutional desks.
          </p>
        </div>

        {/* Global Symbol Search with animated placeholder */}
        <div className="max-w-2xl mx-auto">
          <ResearchHomeClient />
        </div>
      </div>

      {/* 2. Broker Research & Consensus Intelligence Hub */}
      <section aria-labelledby="consensus-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div>
            <h2 id="consensus-heading" className="text-lg font-bold tracking-tight text-foreground">
              Consensus Intelligence Terminal
            </h2>
            <p className="text-xs text-muted-foreground">
              Explore Motilal Oswal, Kotak, ICICI Sec, JM Financial, Nuvama & more with live model revisions.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>11 Desks Actively Synchronized</span>
          </div>
        </div>

        <BrokerResearchHub
          initialConsensus={initialConsensus}
          allReports={allReports}
          sources={sources}
          popularSymbols={RESEARCH_HUB_SYMBOLS}
        />
      </section>

      <section id="earnings-calendar" aria-labelledby="earnings-calendar-heading" className="space-y-4">
        <div className="border-b border-border/40 pb-3">
          <h2 id="earnings-calendar-heading" className="text-lg font-bold tracking-tight text-foreground">
            Nifty 500 earnings calendar
          </h2>
          <p className="text-xs text-muted-foreground">
            Upcoming result dates from Yahoo Finance calendarEvents — same feed as Home, anchored on Research Desk.
          </p>
        </div>
        <EarningsCalendarCard />
      </section>

      {/* 3. Popular Companies & Quick Navigation */}
      <section className="pt-6 border-t border-border/40" aria-labelledby="popular-stocks">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 id="popular-stocks" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Popular Equities & Coverage Dossiers
          </h2>
          <span className="text-xs text-muted-foreground">Quick Research Links</span>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {RESEARCH_HUB_SYMBOLS.map(({ symbol, name }) => (
            <li key={symbol}>
              <Link
                href={`/research/${encodeURIComponent(symbol)}`}
                className="block rounded-lg border border-border/70 bg-card px-3.5 py-2.5 text-xs hover:border-primary/50 hover:bg-card/80 transition-all shadow-sm group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                    {symbol}
                  </span>
                  <span className="text-[11px] text-muted-foreground">View Dossier →</span>
                </div>
                <p className="text-muted-foreground truncate mt-0.5">{name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. Footnotes & Guidelines */}
      <div className="rounded-xl bg-card border border-border/50 p-5 space-y-3">
        <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Coverage Methodology & Intelligence Notes
        </h4>
        <ul className="grid gap-2 md:grid-cols-3 text-xs text-muted-foreground leading-relaxed">
          <li>
            <strong className="text-foreground">Institutional Coverage:</strong> Research notes aggregated from SEBI-registered institutional equities desks. Reports include target prices, earnings revisions, and catalyst tracking.
          </li>
          <li>
            <strong className="text-foreground">Consensus Intelligence:</strong> AI calculates variance drivers between bull and bear theses, isolating exact EBITDA and revenue inflection triggers behind rating upgrades.
          </li>
          <li>
            <strong className="text-foreground">Valuation Models:</strong> From any company page, access interactive Discounted Cash Flow (DCF), Reverse DCF, and peer multiple benchmarking models.
          </li>
        </ul>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/learn" className="font-medium text-primary hover:underline">
          Learn guides
        </Link>{" "}
        ·{" "}
        <Link href="/research/ipo" className="font-medium text-primary hover:underline">
          IPO tracker
        </Link>{" "}
        ·{" "}
        <Link href="/research/offers" className="font-medium text-primary hover:underline">
          NCD · rights · buyback · OFS
        </Link>{" "}
        ·{" "}
        <Link href="/research-reports" className="font-medium text-primary hover:underline">
          Raw Research PDFs Archive
        </Link>
      </p>
    </div>
  );
}
