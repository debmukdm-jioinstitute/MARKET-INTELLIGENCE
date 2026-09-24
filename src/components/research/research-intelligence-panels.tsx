"use client";

import { Panel } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import type {
  AnalyzedNewsItem,
  BrokerResearchItem,
  CorporateActionRow,
  NewsImpactSummary,
} from "@/lib/feeds/research-intelligence";
import { cn } from "@/lib/utils";
import { ExternalLink, FileText, Newspaper, TrendingDown, TrendingUp } from "lucide-react";

type Props = {
  corporateActions: CorporateActionRow[];
  newsFeed: AnalyzedNewsItem[];
  newsSummary: NewsImpactSummary;
  brokerResearch: BrokerResearchItem[];
};

export function ResearchIntelligencePanels({
  corporateActions,
  newsFeed,
  newsSummary,
  brokerResearch,
}: Props) {
  const headlines = brokerResearch.filter((b) => b.kind === "headline");
  const portals = brokerResearch.filter((b) => b.kind !== "headline");

  return (
    <div className="space-y-4">
      <Panel title="News impact (open RSS · rule-based)">
        <ImpactSummaryBanner summary={newsSummary} />
        {newsFeed.length ? (
          <ul className="mt-4 divide-y divide-border">
            {newsFeed.map((n) => (
              <li key={n.id} className="flex gap-3 py-3">
                <ImpactIcon impact={n.impact} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ImpactBadge impact={n.impact} />
                    {n.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-sm">
                        {t}
                      </Badge>
                    ))}
                    <span className="text-sm text-muted-foreground">{n.sourceLabel}</span>
                  </div>
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-sm font-medium hover:text-primary"
                  >
                    {n.title}
                  </a>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{n.rationale}</p>
                  {n.publishedAt ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(n.publishedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No symbol-specific news returned from open feeds.</p>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          Sources: Upstox (India), Google News RSS. Impact labels are keyword heuristics only—not financial advice.
        </p>
      </Panel>

      <Panel title="Corporate actions & filings">
        {corporateActions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-sm text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Subject</th>
                  <th className="py-2 pr-4 font-medium">Ex / filing</th>
                  <th className="py-2 pr-4 font-medium">Record</th>
                  <th className="py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {corporateActions.map((row, i) => (
                  <tr key={`${row.subject}-${i}`} className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      {row.link ? (
                        <a
                          href={row.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {row.subject}
                        </a>
                      ) : (
                        row.subject
                      )}
                      {row.company ? (
                        <p className="text-sm text-muted-foreground">{row.company}</p>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4 text-sm">{row.exDate ?? "—"}</td>
                    <td className="py-2 pr-4 text-sm">{row.recordDate ?? "—"}</td>
                    <td className="py-2 text-sm uppercase text-muted-foreground">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No corporate actions returned (NSE for India, recent SEC forms for US).
          </p>
        )}
      </Panel>

      <Panel title="Brokerage & research (free / open links)">
        <p className="mb-3 text-sm text-muted-foreground">
          Curated portals and headline search—open in a new tab or use on-screen view. We do not scrape paid
          research PDFs.
        </p>
        <ul className="space-y-2">
          {portals.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
            >
              <div className="flex min-w-0 items-start gap-2">
                {b.kind === "search" ? (
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">{b.title}</p>
                  <p className="text-sm text-muted-foreground">{b.source}</p>
                  {b.note ? <p className="text-sm text-muted-foreground">{b.note}</p> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Open
                </a>
              </div>
            </li>
          ))}
        </ul>
        {headlines.length ? (
          <>
            <h4 className="mb-2 mt-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Newspaper className="h-3.5 w-3.5" /> Analyst & brokerage headlines (RSS)
            </h4>
            <ul className="divide-y divide-border">
              {headlines.map((b) => (
                <li key={b.id} className="py-2">
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:text-primary"
                  >
                    {b.title}
                  </a>
                  {b.note ? <p className="text-sm text-muted-foreground">{b.note}</p> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Panel>
    </div>
  );
}

function ImpactSummaryBanner({ summary }: { summary: NewsImpactSummary }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        summary.overall === "positive" && "border-emerald-500/40 bg-emerald-500/10",
        summary.overall === "negative" && "border-rose-500/40 bg-rose-500/10",
        summary.overall === "neutral" && "border-border bg-muted/30",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ImpactBadge impact={summary.overall} large />
        <span className="text-sm font-medium">Sentiment scan</span>
        <span className="text-sm text-muted-foreground">
          +{summary.positiveCount} / −{summary.negativeCount} / ○{summary.neutralCount}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{summary.headline}</p>
    </div>
  );
}

function ImpactBadge({ impact, large }: { impact: AnalyzedNewsItem["impact"]; large?: boolean }) {
  const label = impact === "positive" ? "Positive" : impact === "negative" ? "Negative" : "Neutral";
  return (
    <Badge
      className={cn(
        large ? "text-sm" : "text-sm",
        impact === "positive" && "bg-emerald-500/20 text-emerald-600",
        impact === "negative" && "bg-rose-500/20 text-rose-600",
        impact === "neutral" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </Badge>
  );
}

function ImpactIcon({ impact }: { impact: AnalyzedNewsItem["impact"] }) {
  if (impact === "positive") {
    return <TrendingUp className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />;
  }
  if (impact === "negative") {
    return <TrendingDown className="mt-1 h-4 w-4 shrink-0 text-rose-600" />;
  }
  return <span className="mt-1 h-4 w-4 shrink-0 text-center text-sm text-muted-foreground">○</span>;
}
