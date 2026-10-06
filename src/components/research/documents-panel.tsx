"use client";

import { Panel } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AnnualReportDoc } from "@/lib/financials/types";
import {
  Bell,
  Download,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  Headphones,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { ratingsKey, loadRatings, type RatingsResponse } from "./ratings-panel";

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

async function loadAnnouncements(url: string): Promise<AnnouncementsResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as AnnouncementsResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

type ConcallSummary = {
  quarter: string | null;
  transcriptDate: string;
  guidance: string[];
  growthDrivers: string[];
  risks: string[];
  qaThemes: string[];
  tonePrepared: number | null;
  toneQa: number | null;
  toneDelta: number | null;
  sourceUrl: string;
  generatedBy: string;
};

type ConcallResponse = {
  symbol: string;
  dbConfigured: boolean;
  summary: ConcallSummary | null;
};

async function loadConcall(url: string): Promise<ConcallResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as ConcallResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
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
  const { data: finData } = useSWR<any>(`/api/research/financials?symbol=${encodeURIComponent(symbol)}`, async (u: string) => fetch(u).then((r) => r.json()), { revalidateOnFocus: false });
  const annualReports: AnnualReportDoc[] = initialAnnualReports ?? (finData?.annualReports as AnnualReportDoc[] | undefined) ?? [];
  const [activeTab, setActiveTab] = useState<"annual_reports" | "announcements" | "ratings" | "concalls">("annual_reports");
  const [announcementCategory, setAnnouncementCategory] = useState<string | null>(null);

  // Load announcements
  const announcementsUrl = `/api/research/announcements?symbol=${encodeURIComponent(symbol)}&limit=25${
    announcementCategory ? `&category=${encodeURIComponent(announcementCategory)}` : ""
  }`;
  const { data: annData, isLoading: annLoading } = useSWR<AnnouncementsResponse>(
    announcementsUrl,
    loadAnnouncements,
    { revalidateOnFocus: false },
  );

  // Load credit ratings
  const { data: ratingsData, isLoading: ratingsLoading } = useSWR<RatingsResponse>(
    ratingsKey(symbol),
    loadRatings,
    { revalidateOnFocus: false },
  );

  // Load concalls
  const concallUrl = `/api/research/concall?symbol=${encodeURIComponent(symbol)}`;
  const { data: concallData, isLoading: concallLoading } = useSWR<ConcallResponse>(
    concallUrl,
    loadConcall,
    { revalidateOnFocus: false },
  );

  return (
    <Panel
      id="regulatory-documents"
      title="Statutory Documents & Regulatory Disclosures"
      subtitle="Comprehensive regulatory document archive: official statutory Annual Reports, NSE corporate announcements, credit rating agency rationales, and earnings call transcripts."
      trust={{
        source: "NSE India (Regulation 30, 33 & 34) · CRISIL · CARE · ICRA",
        note: "Every document link leads to the original regulatory PDF or exchange filing as submitted by the issuer.",
      }}
    >
      <div className="space-y-5">
        {/* Document Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 pb-2.5 no-scrollbar">
          {[
            {
              id: "annual_reports",
              label: `Annual Reports (${annualReports.length})`,
              icon: FileSpreadsheet,
            },
            {
              id: "announcements",
              label: `Announcements (${annData?.count ?? "..."})`,
              icon: Bell,
            },
            {
              id: "ratings",
              label: `Credit Ratings (${ratingsData?.events?.length ?? "..."})`,
              icon: FileCheck2,
            },
            {
              id: "concalls",
              label: "Earnings Concalls",
              icon: Headphones,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  active
                    ? "bg-primary/10 text-primary border border-primary/25 shadow-xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent",
                )}
              >
                <Icon className={cn("size-3.5", active ? "text-primary" : "text-muted-foreground")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 1. ANNUAL REPORTS */}
        {activeTab === "annual_reports" && (
          <div className="space-y-4">
            {annualReports.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No annual reports recorded for {symbol}. Verify directly on{" "}
                <a
                  href={`https://www.nseindia.com/companies-listing/corporate-filings-annual-reports?symbol=${encodeURIComponent(symbol)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  NSE Annual Reports portal
                </a>
                .
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {annualReports.map((ar: AnnualReportDoc, idx: number) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-xs transition-all hover:border-primary/40 space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-foreground">{ar.financialYear}</span>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          Official PDF
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{ar.companyName}</p>
                      {ar.broadcastDate ? (
                        <p className="text-[11px] text-muted-foreground/80">
                          Filed on: {ar.broadcastDate}
                        </p>
                      ) : null}
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {ar.fileSize ?? "PDF Document"}
                      </span>
                      <a
                        href={ar.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer"
                      >
                        <Download className="size-3" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. ANNOUNCEMENTS */}
        {activeTab === "announcements" && (
          <div className="space-y-4">
            {/* Category Filter Pills */}
            {annData?.categories?.length ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAnnouncementCategory(null)}
                  className={cn(
                    "rounded-md px-2.5 py-1 transition-all cursor-pointer text-xs font-medium",
                    announcementCategory === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  All ({annData.count})
                </button>
                {annData.categories.map((c) => (
                  <button
                    key={c.category}
                    type="button"
                    onClick={() => setAnnouncementCategory(c.category)}
                    className={cn(
                      "rounded-md px-2.5 py-1 transition-all cursor-pointer text-xs font-medium",
                      announcementCategory === c.category
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {c.category} ({c.count})
                  </button>
                ))}
              </div>
            ) : null}

            {annLoading ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Loading announcements…</p>
            ) : annData?.items?.length ? (
              <div className="divide-y divide-border/50 rounded-xl border border-border/80 bg-card overflow-hidden">
                {annData.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 hover:bg-muted/20 transition-colors">
                    <div className="space-y-1 min-w-0 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {item.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {fmtDate(item.broadcastDate)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground leading-snug">{item.headline}</p>
                    </div>

                    {item.attachmentUrl ? (
                      <a
                        href={item.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <span>View Filing</span>
                        <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No recent announcements found. View on{" "}
                <a href={annData?.nseUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  NSE Corporate Filings
                </a>
                .
              </p>
            )}
          </div>
        )}

        {/* 3. CREDIT RATINGS */}
        {activeTab === "ratings" && (
          <div className="space-y-4">
            {ratingsLoading ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Loading credit ratings…</p>
            ) : ratingsData?.events?.length ? (
              <div className="divide-y divide-border/50 rounded-xl border border-border/80 bg-card overflow-hidden">
                {ratingsData.events.map((ev, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 hover:bg-muted/20 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {ev.agency ? (
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {ev.agency}
                          </Badge>
                        ) : null}
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {fmtDate(ev.date)}
                        </span>
                        {ev.rating ? (
                          <Badge className="bg-primary/10 text-primary text-[10px] font-bold">
                            {ev.rating}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs font-medium text-foreground">{ev.detail}</p>
                    </div>

                    {ev.link ? (
                      <a
                        href={ev.link}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <span>Rating Rationale</span>
                        <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 p-5 text-center text-xs text-muted-foreground">
                <p>No credit rating downgrade or radar events logged for {symbol} in the last 90 days.</p>
                <p className="mt-1">Covered agencies: CRISIL, CARE, ICRA.</p>
              </div>
            )}
          </div>
        )}

        {/* 4. CONCALLS */}
        {activeTab === "concalls" && (
          <div className="space-y-4">
            {concallLoading ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Loading concall summary…</p>
            ) : concallData?.summary ? (
              <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-foreground">
                      {concallData.summary.quarter ?? "Earnings"} Concall Transcript Briefing
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Transcript Date: {fmtDate(concallData.summary.transcriptDate)} · Analyzed via {concallData.summary.generatedBy}
                    </p>
                  </div>
                  {concallData.summary.sourceUrl ? (
                    <a
                      href={concallData.summary.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                    >
                      <span>Full Transcript</span>
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>

                {concallData.summary.guidance.length ? (
                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold text-foreground">Management Guidance & Outlook:</p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      {concallData.summary.guidance.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {concallData.summary.growthDrivers.length ? (
                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold text-foreground">Growth Drivers & Catalysts:</p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      {concallData.summary.growthDrivers.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 p-5 text-center text-xs text-muted-foreground">
                <p>No recent earnings conference call transcript processed for {symbol}.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
