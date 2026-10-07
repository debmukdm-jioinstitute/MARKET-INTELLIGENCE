"use client";

import { Panel } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Fold, Takeaway, Tile } from "@/components/guide/explain";
import { cn } from "@/lib/utils";
import type { AnnualReportDoc } from "@/lib/financials/types";
import { Bell, Download, ExternalLink, FileSpreadsheet, Headphones, ShieldCheck } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

type Announcement = {
  headline: string;
  category: string;
  broadcastDate: string;
  attachmentUrl: string | null;
};

type AnnouncementsResponse = {
  symbol: string;
  dbConfigured: boolean;
  count: number;
  items: Announcement[];
  categories: { category: string; count: number }[];
  nseUrl: string;
};

type RatingsDocResponse = {
  symbol: string;
  agencies: {
    agency: string;
    covered: boolean;
    rating: string | null;
    rationaleUrl: string | null;
    lastActionDate: string | null;
  }[];
  events: {
    type: string;
    agency: string | null;
    date: string;
    rating: string | null;
    detail: string;
    link: string | null;
    source: string;
  }[];
};

type ConcallDocResponse = {
  symbol: string;
  documents?: { title: string; url: string }[];
  history?: { quarter: string | null; transcriptDate: string | null; sourceUrl: string }[];
};

/** Module-level fetchers — never inline an async fn in useSWR (React #185). */
async function loadAnnouncements(url: string): Promise<AnnouncementsResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as AnnouncementsResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

async function loadFinancialsJson(url: string): Promise<{ annualReports?: AnnualReportDoc[] }> {
  const res = await fetch(url);
  if (!res.ok) return {};
  return (await res.json()) as { annualReports?: AnnualReportDoc[] };
}

async function loadRatingsJson(url: string): Promise<RatingsDocResponse> {
  const res = await fetch(url);
  if (!res.ok) return { symbol: "", agencies: [], events: [] };
  return (await res.json()) as RatingsDocResponse;
}

async function loadConcallJson(url: string): Promise<ConcallDocResponse> {
  const res = await fetch(url);
  if (!res.ok) return { symbol: "" };
  return (await res.json()) as ConcallDocResponse;
}

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

export function DocumentsPanel({
  symbol,
  annualReports: initialAnnualReports,
}: {
  symbol: string;
  annualReports?: AnnualReportDoc[];
}) {
  const { data: finData } = useSWR(`/api/research/financials?symbol=${encodeURIComponent(symbol)}`, loadFinancialsJson, { revalidateOnFocus: false });
  const annualReports: AnnualReportDoc[] = initialAnnualReports ?? (finData?.annualReports as AnnualReportDoc[] | undefined) ?? [];
  const [activeTab, setActiveTab] = useState<"annual_reports" | "announcements" | "credit_ratings" | "concalls">("annual_reports");
  const [announcementCategory, setAnnouncementCategory] = useState<string | null>(null);

  const announcementsUrl = `/api/research/announcements?symbol=${encodeURIComponent(symbol)}&limit=25${
    announcementCategory ? `&category=${encodeURIComponent(announcementCategory)}` : ""
  }`;
  const { data: annData, isLoading: annLoading } = useSWR<AnnouncementsResponse>(announcementsUrl, loadAnnouncements, { revalidateOnFocus: false });

  const { data: ratingsData, isLoading: ratingsLoading } = useSWR<RatingsDocResponse>(
    `/api/research/ratings?symbol=${encodeURIComponent(symbol)}`,
    loadRatingsJson,
    { revalidateOnFocus: false },
  );

  const { data: concallData, isLoading: concallLoading } = useSWR<ConcallDocResponse>(
    `/api/research/concall?symbol=${encodeURIComponent(symbol)}&market=IN`,
    loadConcallJson,
    { revalidateOnFocus: false },
  );

  const latestReport = annualReports[0] ?? null;
  const latestNotice = annData?.items?.[0] ?? null;
  const items = annData?.items ?? [];

  const ratingDocs = (ratingsData?.events ?? []).filter((e) => e.link);
  const concallDocs = concallData?.documents ?? [];

  const NoticeRow = ({ item }: { item: Announcement }) => (
    <li className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-sm font-medium">{item.category}</Badge>
          <span className="text-sm tabular-nums text-muted-foreground">{fmtDate(item.broadcastDate)}</span>
        </div>
        <p className="text-base font-medium leading-snug text-foreground">{item.headline}</p>
      </div>
      {item.attachmentUrl ? (
        <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-base font-semibold text-primary hover:underline">
          Read filing <ExternalLink className="size-4" />
        </a>
      ) : null}
    </li>
  );

  return (
    <Panel
      id="regulatory-documents"
      title="Company documents and notices"
      subtitle="The official papers a company files: yearly reports, stock exchange notices, credit rating intimations, and earnings call transcripts."
      trust={{
        source: "NSE India (Regulation 30, 33 & 34) & Official Agency Portals",
        note: "Every link opens the original statutory document as filed by the company.",
      }}
    >
      <div className="space-y-5">
        <Takeaway
          tone="info"
          sub="Official statutory archives: Annual reports, exchange notices, credit rating rationales, and earnings conference call transcripts."
        >
          {latestReport && latestNotice
            ? `Start with the ${latestReport.financialYear} annual report. The latest notice to the exchange was on ${fmtDate(latestNotice.broadcastDate)}.`
            : latestReport
              ? `The latest annual report on file is ${latestReport.financialYear}.`
              : latestNotice
                ? `The latest notice to the exchange was on ${fmtDate(latestNotice.broadcastDate)}.`
                : "Official filings for this company will appear here as they are collected."}
        </Takeaway>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="Annual reports"
            value={annualReports.length}
            hint="Comprehensive yearly business accounts and audited financial statements."
            footer={latestReport ? <a href={latestReport.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><Download className="size-4" /> Latest ({latestReport.financialYear})</a> : null}
          />
          <Tile label="Company notices" value={annData?.count ?? "…"} hint="Short exchange updates: quarterly results, dividends, board meetings." />
          <Tile
            label="Credit rating filings"
            value={ratingDocs.length}
            hint="Statutory intimations from CRISIL, CARE, ICRA & India Ratings."
            footer={<a href="#credit-ratings" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">View Radar →</a>}
          />
          <Tile
            label="Concall transcripts"
            value={concallDocs.length}
            hint="Official quarterly earnings call recordings and transcript filings."
            footer={<a href="#concalls" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">View Tone →</a>}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto border-b border-border/60 pb-3 no-scrollbar">
          {([
            { id: "annual_reports", label: `Annual reports (${annualReports.length})`, icon: FileSpreadsheet },
            { id: "announcements", label: `Company notices (${annData?.count ?? "…"})`, icon: Bell },
            { id: "credit_ratings", label: `Credit ratings (${ratingDocs.length})`, icon: ShieldCheck },
            { id: "concalls", label: `Earnings concalls (${concallDocs.length})`, icon: Headphones },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-base font-semibold transition-all",
                  active ? "border-primary/25 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "annual_reports" && (
          <div className="space-y-4">
            {annualReports.length === 0 ? (
              <p className="py-6 text-center text-base text-muted-foreground">
                No annual reports recorded for {symbol}. Check the{" "}
                <a href={`https://www.nseindia.com/companies-listing/corporate-filings-annual-reports?symbol=${encodeURIComponent(symbol)}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  NSE annual reports page
                </a>
                .
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {annualReports.slice(0, 3).map((ar) => (
                    <div key={ar.url} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4">
                      <div>
                        <p className="text-xl font-bold">{ar.financialYear}</p>
                        <p className="text-sm text-muted-foreground">{ar.broadcastDate ? `Filed ${ar.broadcastDate}` : "Official PDF"}{ar.fileSize ? ` · ${ar.fileSize}` : ""}</p>
                      </div>
                      <a href={ar.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-base font-semibold text-primary hover:bg-primary/20">
                        <Download className="size-4" /> Download report
                      </a>
                    </div>
                  ))}
                </div>
                {annualReports.length > 3 ? (
                  <Fold title={`Older reports (${annualReports.length - 3})`}>
                    <ul className="divide-y divide-border/50">
                      {annualReports.slice(3).map((ar) => (
                        <li key={ar.url} className="flex items-center justify-between gap-3 py-2.5 text-base">
                          <span className="font-medium">{ar.financialYear}</span>
                          <a href={ar.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"><Download className="size-4" /> Download</a>
                        </li>
                      ))}
                    </ul>
                  </Fold>
                ) : null}
              </>
            )}
          </div>
        )}

        {activeTab === "announcements" && (
          <div className="space-y-4">
            {annData?.categories?.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {[{ category: "All", count: annData.count, value: null as string | null }, ...annData.categories.map((c) => ({ ...c, value: c.category as string | null }))].map((c) => (
                  <button
                    key={c.category}
                    type="button"
                    onClick={() => setAnnouncementCategory(c.value)}
                    className={cn(
                      "cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                      announcementCategory === c.value ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c.category} ({c.count})
                  </button>
                ))}
              </div>
            ) : null}

            {annLoading ? (
              <p className="py-6 text-center text-base text-muted-foreground">Loading company notices…</p>
            ) : items.length ? (
              <>
                <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border bg-card">
                  {items.slice(0, 6).map((item, idx) => <NoticeRow key={idx} item={item} />)}
                </ul>
                {items.length > 6 ? (
                  <Fold title={`Show ${items.length - 6} more notices`}>
                    <ul className="-mx-4 divide-y divide-border/50">
                      {items.slice(6).map((item, idx) => <NoticeRow key={idx} item={item} />)}
                    </ul>
                  </Fold>
                ) : null}
              </>
            ) : (
              <p className="py-6 text-center text-base text-muted-foreground">
                No recent notices found. See{" "}
                <a href={annData?.nseUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">NSE corporate filings</a>.
              </p>
            )}
            <Fold title="What kinds of notices are these?">
              <p className="text-base leading-relaxed text-muted-foreground">
                Listed companies must tell the stock exchange about anything that could affect the share price: quarterly results, dividends, board meetings, new orders, rating changes and leadership moves. They are posted here as filed.
              </p>
            </Fold>
          </div>
        )}

        {activeTab === "credit_ratings" && (
          <div className="space-y-4">
            {ratingsLoading ? (
              <p className="py-6 text-center text-base text-muted-foreground">Loading credit rating filings…</p>
            ) : ratingDocs.length ? (
              <>
                <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border bg-card">
                  {ratingDocs.map((r, idx) => (
                    <li key={idx} className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {r.agency ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                              {r.agency}
                            </Badge>
                          ) : null}
                          {r.rating ? (
                            <Badge variant="outline" className="text-xs font-semibold">
                              {r.rating}
                            </Badge>
                          ) : null}
                          <span className="text-sm tabular-nums text-muted-foreground">{fmtDate(r.date)}</span>
                          <span className="text-xs text-muted-foreground">({r.source})</span>
                        </div>
                        <p className="text-base font-medium leading-snug text-foreground">{r.detail}</p>
                      </div>
                      {r.link ? (
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 text-base font-semibold text-primary hover:underline"
                        >
                          Read filing <ExternalLink className="size-4" />
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Looking for rating matrix comparison and agency credit outlook?
                  </p>
                  <a href="#credit-ratings" className="text-sm font-semibold text-primary hover:underline">
                    Open Credit Ratings Radar →
                  </a>
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-base text-muted-foreground">
                No statutory credit rating intimations filed recently for {symbol}.
              </p>
            )}
          </div>
        )}

        {activeTab === "concalls" && (
          <div className="space-y-4">
            {concallLoading ? (
              <p className="py-6 text-center text-base text-muted-foreground">Loading concall archives…</p>
            ) : concallDocs.length ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {concallDocs.map((doc, idx) => (
                    <div key={idx} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Headphones className="size-4 text-primary" />
                          <p className="text-base font-bold text-foreground">{doc.title || "Earnings Call Transcript"}</p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">Official Exchange Submission</p>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
                      >
                        <ExternalLink className="size-4" /> Read transcript PDF
                      </a>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Want AI management tone tracking and Q&A sentiment analysis?
                  </p>
                  <a href="#concalls" className="text-sm font-semibold text-primary hover:underline">
                    Open Concall Tone Analysis →
                  </a>
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-base text-muted-foreground">
                No earnings call transcripts recorded for {symbol}.
              </p>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
