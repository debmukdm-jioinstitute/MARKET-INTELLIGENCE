import { ResearchHomeClient } from "@/app/(portal)/research/research-home-client";
import { RecentSymbolsStrip } from "@/components/research/recent-symbols-strip";
import { BrokerResearchHub } from "@/components/broker-research/broker-research-hub";
import { EarningsCalendarCard } from "@/components/dashboard/earnings-calendar-card";
import { BROKER_SOURCES } from "@/lib/research/broker-sources";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { mapResearchRow, type ApiResearchReport } from "@/lib/research/api-map";
import { pageMetadata } from "@/lib/seo/metadata";
import { RESEARCH_HUB_SYMBOLS } from "@/lib/seo/popular-symbols";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Broker Research Notes Aggregator",
  description:
    "Equity research notes collected from public publications of Indian institutional desks (Motilal Oswal, Kotak, ICICI Sec, HDFC Sec, etc.), with target prices and recommendations exactly as published.",
  path: "/research",
});

/** Real ingested research notes (research_reports table). Empty array when none ingested. */
async function getInitialReports(): Promise<ApiResearchReport[]> {
  if (!hasDatabase()) return [];
  try {
    await ensureSchema();
    const db = sql();
    const rows = await db`
      SELECT
        id, source, broker, title, url, pdf_url, symbol, recommendation,
        target_price, cmp, upside_pct, report_type, summary, published_at, scraped_at, extra
      FROM research_reports
      ORDER BY COALESCE(published_at, scraped_at) DESC
      LIMIT 100
    `;
    return rows.map((r) => mapResearchRow(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export default async function ResearchPage() {
  const initialReports = await getInitialReports();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:py-12 space-y-12">
      {/* 1. Page Header & Hero Search */}
      <div className="space-y-6">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-foreground">
            Broker Research Notes Aggregator
          </h1>
          <p className="mx-auto mt-3 text-sm text-muted-foreground leading-relaxed">
            Research notes collected from public publications of Indian institutional
            equities desks — with target prices and recommendations exactly as published.
            Only notes actually collected are shown; nothing is estimated or simulated.
          </p>
        </div>

        {/* Global Symbol Search with animated placeholder */}
        <div className="max-w-2xl mx-auto">
          <ResearchHomeClient />
          <RecentSymbolsStrip />
        </div>
      </div>

      {/* 2. Broker Research Notes Hub */}
      <section aria-labelledby="research-notes-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div>
            <h2 id="research-notes-heading" className="text-lg font-bold tracking-tight text-foreground">
              Research Notes Feed
            </h2>
            <p className="text-xs text-muted-foreground">
              Filter notes by company, or browse the latest notes from all desks.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{initialReports.length} notes collected</span>
          </div>
        </div>

        <BrokerResearchHub
          initialReports={initialReports}
          sources={BROKER_SOURCES}
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
          Coverage Methodology & Notes
        </h4>
        <ul className="grid gap-2 md:grid-cols-3 text-xs text-muted-foreground leading-relaxed">
          <li>
            <strong className="text-foreground">Collected notes:</strong> Research notes aggregated from public publications of SEBI-registered institutional equities desks. Reports show target prices and recommendations exactly as published.
          </li>
          <li>
            <strong className="text-foreground">No estimates:</strong> We do not estimate, simulate, or impute target prices, ratings, or consensus figures. If no notes have been collected for a company, the feed says so explicitly.
          </li>
          <li>
            <strong className="text-foreground">Fundamentals:</strong> Company dossiers include key ratios, risk metrics, ownership, and broker research where collected — no automated intrinsic-value or DCF worksheet on the site.
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
