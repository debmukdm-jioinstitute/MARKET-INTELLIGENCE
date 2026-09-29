"use client";

import { useState } from "react";
import { IrDocument, IrDocumentCategory } from "@/lib/company-intelligence/types";
import {
  FolderTree,
  FileText,
  Presentation,
  Headphones,
  Leaf,
  BookOpen,
  MessageSquare,
  Calendar,
  ExternalLink,
  Download,
  Filter,
} from "lucide-react";

interface Props {
  documents: IrDocument[];
  companyName: string;
  symbol: string;
  irBaseUrl: string;
}

export function IrCrawlerView({ documents, companyName, symbol, irBaseUrl }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const categories = [
    { id: "ALL", label: "All Crawled Artifacts" },
    { id: "INVESTOR_PRESENTATION", label: "Presentations" },
    { id: "EARNINGS_RELEASE", label: "Earnings Releases" },
    { id: "ANNUAL_REPORT", label: "Annual Reports" },
    { id: "ESG_REPORT", label: "ESG / BRSR" },
    { id: "PRESS_RELEASE", label: "Press Releases" },
    { id: "MANAGEMENT_COMMENTARY", label: "Commentary" },
    { id: "EVENTS", label: "Events & AGMs" },
    { id: "CONCALL_MATERIALS", label: "Concall Materials" },
  ];

  const filtered = selectedCategory === "ALL"
    ? documents
    : documents.filter((d) => d.category === selectedCategory);

  const getDocIcon = (category: IrDocumentCategory) => {
    switch (category) {
      case "INVESTOR_PRESENTATION":
        return <Presentation className="w-4 h-4 text-indigo-400" />;
      case "EARNINGS_RELEASE":
        return <FileText className="w-4 h-4 text-sky-400" />;
      case "ANNUAL_REPORT":
        return <BookOpen className="w-4 h-4 text-orange-400" />;
      case "ESG_REPORT":
        return <Leaf className="w-4 h-4 text-emerald-400" />;
      case "PRESS_RELEASE":
        return <FileText className="w-4 h-4 text-amber-400" />;
      case "MANAGEMENT_COMMENTARY":
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case "EVENTS":
        return <Calendar className="w-4 h-4 text-teal-400" />;
      case "CONCALL_MATERIALS":
        return <Headphones className="w-4 h-4 text-blue-400" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & IR Crawler Tree Architecture Banner */}
      <div className="p-5 rounded-xl bg-card border border-border/60 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Automated IR Crawler Directory — {companyName}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full taxonomy crawler synchronizing disclosures from official IR portals and exchange servers.
              </p>
            </div>
          </div>

          <a
            href={irBaseUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20"
          >
            <span>Visit Official IR Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Tree Taxonomy Visual Bar */}
        <div className="p-3.5 rounded-lg bg-muted/20 border border-border/40 text-xs text-muted-foreground space-y-2">
          <div className="font-semibold text-foreground flex items-center gap-2">
            <span>Crawled IR Hierarchy</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-bold">├──</span>
              <span>Investor Presentations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-bold">├──</span>
              <span>Earnings Releases</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-bold">├──</span>
              <span>Annual Reports</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-bold">├──</span>
              <span>ESG / BRSR Reports</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-bold">├──</span>
              <span>Press Releases</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-bold">├──</span>
              <span>Management Commentary</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-bold">├──</span>
              <span>Events & AGMs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-primary font-bold">└──</span>
              <span>Concall Audio & Transcripts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-1.5 flex-wrap pb-1">
        <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              selectedCategory === c.id
                ? "bg-primary text-primary-foreground font-medium shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((doc) => (
          <div
            key={doc.id}
            className="p-4 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all shadow-sm space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-muted/40">
                    {getDocIcon(doc.category)}
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    {doc.periodOrDate}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">
                    {doc.fileType}
                  </span>
                  {doc.fileSizeMb && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {doc.fileSizeMb} MB
                    </span>
                  )}
                </div>
              </div>

              <h4 className="text-sm font-semibold text-foreground leading-snug">
                {doc.title}
              </h4>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {doc.summary}
              </p>

              {doc.highlights && doc.highlights.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-semibold text-foreground/80 block">
                    Key Highlights:
                  </span>
                  <ul className="space-y-1">
                    {doc.highlights.map((h, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-primary font-bold">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Verified Exchange Source
              </span>
              <a
                href={doc.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <span>Access Document</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
