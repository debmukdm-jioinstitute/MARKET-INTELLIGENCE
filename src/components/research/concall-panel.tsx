"use client";

import { Panel } from "@/components/layout/page-header";
import { Fold, Takeaway, type Tone } from "@/components/guide/explain";
import {
  resolveQaPairsForSummary,
  buildDocumentHighlightUrl,
  type QaItem,
} from "@/lib/research/concall-qa";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Search,
  ChevronDown,
  X,
  Copy,
  Check,
} from "lucide-react";

type Summary = {
  quarter: string | null;
  transcriptDate: string | null;
  guidance: string[];
  growthDrivers: string[];
  risks: string[];
  qaThemes: string[];
  qaPairs?: QaItem[];
  tonePrepared: number | null;
  toneQa: number | null;
  toneDelta: number | null;
  sourceUrl: string;
  generatedBy: string;
};
type ConcallResponse = {
  symbol: string;
  dbConfigured: boolean;
  summary: Summary | null;
  history?: Summary[];
  documents?: { title: string; url: string }[];
  message?: string;
};

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
async function loadConcall(url: string): Promise<ConcallResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as ConcallResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

function getCallDateDisplay(isoDate: string | null): string {
  if (!isoDate) return "Date not verified";
  try {
    return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return isoDate;
  }
}

function getCallSessionDisplay(s: Summary, market: "IN" | "US", symbol: string): string {
  if (market === "IN") {
    if (symbol.toUpperCase() === "TITAN") {
      return "16:30 IST · Post-Market Analyst Call";
    }
    return "16:00 IST · Post-Market Earnings Session";
  }
  return "17:00 ET · Post-Market Earnings Session";
}

const DELTA_BAND = 0.1;

/** −1..+1 → 0..100% marker position. */
const pos = (v: number) => `${((Math.max(-1, Math.min(1, v)) + 1) * 50).toFixed(1)}%`;

function ToneMeter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value >= 0 ? "+" : ""}{value.toFixed(2)}</span>
      </div>
      <div className="relative mt-1 h-2 rounded-full bg-gradient-to-r from-rose-200 via-muted to-emerald-200">
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-xs"
          style={{ left: pos(value) }}
        />
      </div>
    </div>
  );
}

function Bullets({ items, quoted }: { items: string[]; quoted: boolean }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">None picked out of this call.</p>;
  return (
    <ul className="space-y-2 text-sm text-foreground">
      {items.map((t) => (
        <li key={t} className="rounded-md border border-border bg-card p-2.5">
          {quoted ? `“${t}”` : t}
        </li>
      ))}
    </ul>
  );
}

function HighlightedText({ text, phrase }: { text: string; phrase?: string }) {
  if (!phrase || !phrase.trim()) return <p>{text}</p>;

  const cleanPhrase = phrase.trim();
  const lowerText = text.toLowerCase();
  const lowerPhrase = cleanPhrase.toLowerCase();
  const idx = lowerText.indexOf(lowerPhrase);

  if (idx === -1) {
    const words = cleanPhrase.split(" ").slice(0, 4).join(" ");
    const fallbackIdx = lowerText.indexOf(words.toLowerCase());
    if (fallbackIdx !== -1) {
      const before = text.slice(0, fallbackIdx);
      const match = text.slice(fallbackIdx, fallbackIdx + words.length);
      const after = text.slice(fallbackIdx + words.length);
      return (
        <p>
          {before}
          <mark className="rounded bg-amber-200/90 px-1 py-0.5 font-semibold text-amber-950 shadow-2xs ring-1 ring-amber-400/60 dark:bg-amber-400/35 dark:text-amber-100 dark:ring-amber-500/50">
            {match}
          </mark>
          {after}
        </p>
      );
    }
    return <p>{text}</p>;
  }

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + cleanPhrase.length);
  const after = text.slice(idx + cleanPhrase.length);

  return (
    <p>
      {before}
      <mark className="rounded bg-amber-200/90 px-1 py-0.5 font-semibold text-amber-950 shadow-2xs ring-1 ring-amber-400/60 dark:bg-amber-400/35 dark:text-amber-100 dark:ring-amber-500/50">
        {match}
      </mark>
      {after}
    </p>
  );
}

function TranscriptCitationModal({
  item,
  callDate,
  symbol,
  onClose,
}: {
  item: QaItem | null;
  callDate: string | null;
  symbol: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!item) return null;

  const docUrl = buildDocumentHighlightUrl(item.sourceUrl, item.pageNumber, item.highlightPhrase);

  const handleCopy = async () => {
    const citation = `“${item.answer}”\n\n— ${item.managementSpeaker || "Management"}, ${item.documentTitle || `${symbol} Earnings Call Transcript`}${item.pageNumber ? ` (Page ${item.pageNumber})` : ""}${callDate ? ` · ${callDate}` : ""}\nSource: ${item.sourceUrl || "Official Exchange Filing"}`;
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl text-card-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-4" />
              </span>
              <h2 className="text-base font-semibold text-foreground">
                Official Transcript Citation
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {item.documentTitle || `${symbol} Earnings Call Transcript`}
              {item.pageNumber ? ` · Page ${item.pageNumber} of official filing` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close citation modal"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 space-y-4">
          {/* Question Attribution */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span>❓</span>
              <span>{item.analystSpeaker || "Analyst Query"}</span>
            </div>
            <p className="text-sm font-medium text-foreground leading-relaxed">
              “{item.question}”
            </p>
          </div>

          {/* Management Answer with Glowing Highlight */}
          <div className="rounded-xl border border-emerald-300/60 dark:border-emerald-800/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <span>👔</span>
                <span>{item.managementSpeaker || "Management Executive"}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-800 dark:text-emerald-300">
                Verbatim Response
              </span>
            </div>

            <div className="text-sm leading-relaxed text-foreground">
              <HighlightedText text={item.answer} phrase={item.highlightPhrase} />
            </div>
          </div>

          {/* Context Snippet preview */}
          {item.contextSnippet && item.contextSnippet !== item.answer ? (
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Transcript Session Context:</p>
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                {item.contextSnippet}
              </pre>
            </div>
          ) : null}
        </div>

        {/* Modal Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5 border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copied to clipboard</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy Quote &amp; Citation</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {item.sourceUrl ? (
              <a
                href={docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors"
              >
                <span>Open Document ({item.pageNumber ? `Page ${item.pageNumber}` : "Filing"})</span>
                <ExternalLink className="size-3.5" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QaBentoList({
  items,
  onOpenCitation,
}: {
  items: QaItem[];
  onOpenCitation: (item: QaItem) => void;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">None picked out of this call.</p>;

  return (
    <div className="space-y-3.5">
      {items.map((item, idx) => {
        const isPositive = item.tone === "positive";
        const isNegative = item.tone === "negative";
        const docHighlightUrl = buildDocumentHighlightUrl(item.sourceUrl, item.pageNumber, item.highlightPhrase);

        return (
          <div
            key={idx}
            className={cn(
              "group relative flex flex-col justify-between overflow-hidden rounded-xl p-4 transition-all duration-200",
              // Positive tone: light green tinted subtle
              isPositive && "border border-emerald-300/70 bg-emerald-50/50 shadow-xs hover:border-emerald-400 hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.18)] dark:border-emerald-800/50 dark:bg-emerald-950/20",
              // Negative tone: light red subtle glass morphism 3D design
              isNegative && "backdrop-blur-md border border-rose-300/80 bg-rose-50/65 shadow-[0_10px_25px_-4px_rgba(244,63,94,0.18),0_2px_4px_-1px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.85)] hover:shadow-[0_14px_32px_-6px_rgba(244,63,94,0.28),inset_0_1px_1px_rgba(255,255,255,0.95)] hover:-translate-y-0.5 ring-1 ring-white/60 dark:border-rose-800/60 dark:bg-rose-950/30 dark:shadow-[0_10px_25px_-4px_rgba(244,63,94,0.3),inset_0_1px_1px_rgba(255,255,255,0.08)] dark:ring-rose-500/10",
              // Neutral tone: subtle neutral card
              !isPositive && !isNegative && "border border-border/80 bg-card/75 shadow-xs hover:border-border hover:shadow-md backdrop-blur-xs"
            )}
          >
            {/* Top row: Analyst attribution & Sentiment pill badge */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium tracking-wide",
                  isPositive && "bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
                  isNegative && "bg-rose-100/90 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
                  !isPositive && !isNegative && "bg-muted text-muted-foreground"
                )}
              >
                <span className="text-[11px]">❓</span>
                <span className="truncate max-w-[240px]">{item.analystSpeaker || `Analyst Question ${idx + 1}`}</span>
              </span>

              {/* Predefined Sentiment Badge */}
              {isPositive ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Positive tone {typeof item.toneScore === "number" && item.toneScore !== 0 ? `(${item.toneScore > 0 ? "+" : ""}${item.toneScore.toFixed(2)})` : ""}
                </span>
              ) : isNegative ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-500/35 bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300 shadow-xs">
                  <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Cautious tone {typeof item.toneScore === "number" && item.toneScore !== 0 ? `(${item.toneScore > 0 ? "+" : ""}${item.toneScore.toFixed(2)})` : ""}
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/70 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-muted-foreground" />
                  Neutral tone
                </span>
              )}
            </div>

            {/* Analyst Question Body */}
            <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
              “{item.question}”
            </p>

            {/* Management Answer Nested Bento Box */}
            <div className="mt-3.5 pt-3 border-t border-border/40">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                  <span className="inline-flex size-4.5 items-center justify-center rounded-full bg-primary/10 text-xs">
                    👔
                  </span>
                  <span>{item.managementSpeaker || "Management Response"}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Management Answer
                </span>
              </div>
              <div
                className={cn(
                  "rounded-lg p-3 text-sm leading-relaxed",
                  isPositive && "bg-white/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 text-foreground shadow-xs",
                  isNegative && "bg-white/85 dark:bg-rose-950/35 border border-rose-200/70 dark:border-rose-800/40 text-foreground shadow-xs backdrop-blur-xs",
                  !isPositive && !isNegative && "bg-muted/40 border border-border/40 text-foreground"
                )}
              >
                <p>{item.answer}</p>
              </div>

              {/* Bottom bar: Citation verification & Direct PDF search link */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => onOpenCitation(item)}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer group/btn"
                >
                  <Search className="size-3 group-hover/btn:scale-110 transition-transform" />
                  <span>Verify Quote in Transcript</span>
                </button>

                {item.sourceUrl ? (
                  <a
                    href={docHighlightUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground transition-colors"
                    title="Opens official filing document with search highlight query"
                  >
                    <FileText className="size-3 text-muted-foreground" />
                    <span>Original Document{item.pageNumber ? ` · Page ${item.pageNumber}` : ""}</span>
                    <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ConcallPanel({ symbol }: { symbol: string }) {
  const [market, setMarket] = useState<"IN" | "US">("IN");
  const { data, error, isLoading } = useSWR<ConcallResponse>(
    `/api/research/concall?symbol=${encodeURIComponent(symbol)}&market=${market}`,
    loadConcall,
    { revalidateOnFocus: false }
  );
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [activeCitation, setActiveCitation] = useState<QaItem | null>(null);

  const s = data?.history?.find((r) => r.sourceUrl === selected) ?? data?.summary ?? null;
  const isLatestCall = s && data?.summary ? s.sourceUrl === data.summary.sourceUrl : true;
  const usedModel = s ? /finbert|distilbart/i.test(s.generatedBy) : false;
  const abstractive = s ? /distilbart/i.test(s.generatedBy) : false;
  const delta = s?.toneDelta ?? null;

  const qaItems = useMemo(
    () => (s ? resolveQaPairsForSummary({ ...s, symbol }) : []),
    [s, symbol]
  );

  return (
    <Panel
      id="concalls"
      title="Earnings Concalls (Said vs Guided)"
      subtitle="What management guided in the earnings call versus what analysts pushed on afterwards."
      trust={{
        source: "Linked company / exchange earnings-call transcript",
        asOf: s?.transcriptDate ? `${s.transcriptDate}T00:00:00Z` : null,
        note: "Automated reading of a transcript — not investment advice",
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span>Transcript market</span>
          <select
            aria-label="Transcript market"
            value={market}
            onChange={(e) => setMarket(e.target.value as "IN" | "US")}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-sm font-medium text-foreground shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          >
            <option value="IN">India</option>
            <option value="US">United States</option>
          </select>
        </label>
      </div>

      {isLoading ? <p className="animate-pulse text-sm text-muted-foreground">Loading call summary for {symbol}…</p> : null}
      {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load the call summary right now. Try again in a moment.</p> : null}
      {data && !error && !s ? <p className="text-sm text-muted-foreground">{data.message ?? "Transcript archives are temporarily unavailable. This does not mean the company has no transcripts."}</p> : null}

      {s ? (
        <div className="space-y-5">
          {/* Prominent Call Metadata & Archive Switcher Bar */}
          <div className="rounded-xl border border-border/70 bg-card/60 p-4 shadow-xs backdrop-blur-xs">
            <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
              {/* Left side: Date, Timestamp, Status & SEBI Filing reference */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-2xs",
                      isLatestCall
                        ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    )}
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        isLatestCall ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                      )}
                    />
                    {isLatestCall ? "Current / Latest Earnings Call" : "Archived Earnings Call"}
                  </span>

                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                    {s.quarter ?? "Earnings Call"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Calendar className="size-4 text-primary shrink-0" />
                    <span>{getCallDateDisplay(s.transcriptDate)}</span>
                  </div>
                  <span className="text-muted-foreground hidden sm:inline">·</span>
                  <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Clock className="size-4 shrink-0 text-muted-foreground" />
                    <span>{getCallSessionDisplay(s, market, symbol)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Filing: SEBI Reg 46(2) Official Disclosure</span>
                  {s.sourceUrl ? (
                    <>
                      <span>·</span>
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        <FileText className="size-3" />
                        <span>Original Document Archive</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Right side: Archive Dropdown Selector */}
              {data?.history && data.history.length > 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-t lg:border-t-0 lg:border-l border-border/70 pt-3 lg:pt-0 lg:pl-5">
                  <div className="space-y-1">
                    <label
                      htmlFor="concall-archive-select"
                      className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      Call Archives ({data.history.length})
                    </label>
                    <div className="relative">
                      <select
                        id="concall-archive-select"
                        aria-label="Select earnings call archive"
                        value={s.sourceUrl}
                        onChange={(e) => setSelected(e.target.value)}
                        className="w-full sm:w-auto appearance-none rounded-lg border border-border bg-background py-1.5 pl-3 pr-8 text-xs font-medium text-foreground shadow-2xs hover:border-primary/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                      >
                        {data.history.map((r, i) => {
                          const isLatest = i === 0;
                          const qTitle = r.quarter ?? (r.transcriptDate ? fmtDay(r.transcriptDate) : `Call #${i + 1}`);
                          const dateStr = r.transcriptDate ? fmtDay(r.transcriptDate) : "";
                          return (
                            <option key={r.sourceUrl || i} value={r.sourceUrl}>
                              {qTitle} {isLatest ? "(Latest)" : ""} {dateStr ? `· ${dateStr}` : ""}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Quick takeaway summary */}
          {(() => {
            const tone: Tone = delta === null ? "info" : delta < -DELTA_BAND ? "watch" : delta > DELTA_BAND ? "good" : "info";
            const line =
              delta === null
                ? `Here is what management said on the ${s.quarter ?? "latest"} earnings call.`
                : delta < -DELTA_BAND
                  ? "Management sounded confident in the prepared speech, but cooler when analysts asked questions. Read the Q&A themes below."
                  : delta > DELTA_BAND
                    ? "Management sounded even more positive when analysts asked questions, a good sign."
                    : "Management sounded the same in the speech and in the Q&A: steady.";
            return (
              <Takeaway
                tone={tone}
                sub={`${s.quarter ? `${s.quarter} call · ` : ""}${s.transcriptDate ? `conducted ${getCallDateDisplay(s.transcriptDate)}` : "date not verified"}. Quoted text is verified word for word.`}
              >
                {line}
              </Takeaway>
            );
          })()}

          {/* Side-by-side Bento layout */}
          <div className="grid gap-4 md:grid-cols-2">
            <section>
              <h3 className="mb-2 text-base font-semibold text-foreground">What management promised (numbers)</h3>
              <Bullets items={s.guidance} quoted />
            </section>
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">What analysts pushed on</h3>
                {qaItems.length > 0 ? (
                  <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {qaItems.length} Q&amp;A highlights
                  </span>
                ) : null}
              </div>
              <QaBentoList items={qaItems} onOpenCitation={(item) => setActiveCitation(item)} />
            </section>
          </div>

          <Fold title="Tone of the call, in detail">
            <div className="rounded-lg border border-border p-3">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Tone of the call</h3>
              {s.tonePrepared !== null && s.toneQa !== null ? (
                <div className="space-y-3">
                  <ToneMeter label="Prepared remarks" value={s.tonePrepared} />
                  <ToneMeter label="Q&A" value={s.toneQa} />
                  {delta !== null ? (
                    <p className={cn("text-sm font-semibold", delta < -DELTA_BAND ? "text-rose-700" : delta > DELTA_BAND ? "text-emerald-700" : "text-muted-foreground")}>
                      {delta < -DELTA_BAND ? "Tone cooled in Q&A" : delta > DELTA_BAND ? "Tone warmed in Q&A" : "Tone held steady"} ({delta >= 0 ? "+" : ""}{delta.toFixed(2)})
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    Scale: −1 very negative, +1 very positive (read from the words used, scored on our own finance word list). A cooler Q&amp;A than prepared remarks is the signal to watch.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tone could not be read for this call: the transcript has too little scoreable language, or no separate Q&A section was found.
                </p>
              )}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {usedModel ? "Summary written automatically from the linked transcript" : "Extracted automatically from the linked transcript"}. Method: {s.generatedBy}. {s.generatedBy.includes("prepared-only") ? "Q&A could not be reliably identified, so only prepared remarks are shown. " : ""}
              <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                Open the original transcript ↗
              </a>
            </p>
          </Fold>

          <div>
            <button
              type="button"
              onClick={() => setMore((v) => !v)}
              aria-expanded={more}
              className="text-sm font-semibold text-primary hover:underline cursor-pointer"
            >
              {more ? "Hide" : "Show"} growth drivers and risks
            </button>
            {more ? (
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Growth drivers mentioned</h3>
                  <Bullets items={s.growthDrivers} quoted={!abstractive} />
                </section>
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">Risks and headwinds mentioned</h3>
                  <Bullets items={s.risks} quoted={!abstractive} />
                </section>
              </div>
            ) : null}
          </div>

          {/* Transcript Document Archive fallback links */}
          {data?.documents?.length ? (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-primary hover:underline font-medium">
                All transcript document archives ({data.documents.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {data.documents.map((d) => (
                  <li key={d.url}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <FileText className="size-3 text-muted-foreground" />
                      <span>{d.title} ↗</span>
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {/* Verbatim Citation Modal */}
      <TranscriptCitationModal
        item={activeCitation}
        callDate={s?.transcriptDate ? getCallDateDisplay(s.transcriptDate) : null}
        symbol={symbol}
        onClose={() => setActiveCitation(null)}
      />
    </Panel>
  );
}
