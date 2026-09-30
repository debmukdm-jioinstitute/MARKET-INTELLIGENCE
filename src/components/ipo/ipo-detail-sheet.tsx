"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MetricInfo } from "@/components/ui/metric-info";
import { useIpoDetail } from "@/hooks/use-ipo-list";
import type { DrhpSummary } from "@/lib/feeds/ipo/drhp-summary";
import { IpoIntelligencePanel } from "@/components/ipo/ipo-intelligence-panel";
import { fmtInr } from "@/lib/format-india";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const TIMELINE_LABELS: { key: string; label: string }[] = [
  { key: "preApplyStartDate", label: "Pre-apply opens (block UPI limit before bidding)" },
  { key: "applicationStartDate", label: "Bidding opens" },
  { key: "applicationEndDate", label: "Bidding closes" },
  { key: "allotmentDate", label: "Allotment" },
  { key: "refundInitiationDate", label: "Refunds initiated" },
  { key: "listingDate", label: "Listing date" },
];

export function IpoDetailSheet({
  ipoId,
  open,
  onOpenChange,
}: {
  ipoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { detail, loading, error } = useIpoDetail(ipoId, open);
  const [summary, setSummary] = useState<DrhpSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    setSummary(null);
    setSummaryError(null);
    setSummaryLoading(false);
  }, [ipoId]);

  const loadSummary = async () => {
    if (!ipoId || summaryLoading) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/ai/ipo-drhp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ipoId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSummary(json as DrhpSummary);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Summary failed");
    } finally {
      setSummaryLoading(false);
    }
  };

  const gmpLabel =
    detail?.gmpInr == null
      ? "Unavailable"
      : `${detail.gmpInr > 0 ? "+" : ""}${fmtInr(detail.gmpInr)}${
          detail.gmpPct != null ? ` (${detail.gmpPct > 0 ? "+" : ""}${detail.gmpPct}%)` : ""
        }`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{detail?.name ?? "IPO detail"}</SheetTitle>
          <SheetDescription>{detail?.industry}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          {loading && !detail ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {detail ? (
            <>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Stat k="Price band" v={`${fmtInr(detail.minPrice)}–${fmtInr(detail.maxPrice)}`} />
                <Stat k="Cut-off price" v={detail.cutOffPrice != null ? fmtInr(detail.cutOffPrice) : "—"} />
                <Stat k="Lot size" v={detail.lotSize?.toLocaleString("en-IN") ?? "—"} />
                <Stat k="Min quantity" v={detail.minimumQuantity?.toLocaleString("en-IN") ?? "—"} />
                <Stat k="Face value" v={detail.faceValue != null ? fmtInr(detail.faceValue) : "—"} />
                <Stat k="Issue size" v={`₹${detail.issueSize} Cr`} />
                <Stat k="Exchange" v={detail.listingExchange ?? "—"} />
                <Stat k="Subscription" v={detail.totalSubscription ? `${detail.totalSubscription}x` : "—"} />
              </dl>

              <div className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5">
                <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Grey market premium
                  <MetricInfo id="ipo_gmp" name="Grey Market Premium" iconSize="xs" />
                </div>
                <p
                  className={`mt-1 text-sm font-semibold tabular-nums ${
                    detail.gmpInr != null && detail.gmpInr > 0
                      ? "text-emerald-700"
                      : detail.gmpInr != null && detail.gmpInr < 0
                        ? "text-rose-700"
                        : "text-foreground"
                  }`}
                >
                  {gmpLabel}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Grey market premium — an unofficial price signal from OTC trading, not published by NSE/BSE
                  {detail.gmpSource ? ` (${detail.gmpSource.provider})` : ""}. Can change anytime — not a listing guarantee.
                </p>
              </div>

              <Accordion type="single" collapsible defaultValue="timeline">
                <AccordionItem value="timeline">
                  <AccordionTrigger>Timeline</AccordionTrigger>
                  <AccordionContent>
                    <dl className="space-y-1 text-sm">
                      {TIMELINE_LABELS.map(({ key, label }) => {
                        const value = detail.timeline[key as keyof typeof detail.timeline];
                        return value ? <Stat key={key} k={label} v={value} /> : null;
                      })}
                    </dl>
                  </AccordionContent>
                </AccordionItem>
                {detail.registrar ? (
                  <AccordionItem value="registrar">
                    <AccordionTrigger>Registrar</AccordionTrigger>
                    <AccordionContent>
                      <dl className="space-y-1 text-sm">
                        <Stat k="Name" v={detail.registrar.name} />
                        {detail.registrar.contactName ? (
                          <Stat k="Contact" v={detail.registrar.contactName} />
                        ) : null}
                        {detail.registrar.contactNumber ? (
                          <Stat k="Phone" v={detail.registrar.contactNumber} />
                        ) : null}
                        {detail.registrar.email ? <Stat k="Email" v={detail.registrar.email} /> : null}
                      </dl>
                    </AccordionContent>
                  </AccordionItem>
                ) : null}
                {detail.drhpUrl || detail.rhpUrl ? (
                  <AccordionItem value="docs">
                    <AccordionTrigger>Prospectus</AccordionTrigger>
                    <AccordionContent className="space-y-1 text-sm">
                      {detail.drhpUrl ? (
                        <a href={detail.drhpUrl} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">
                          DRHP
                        </a>
                      ) : null}
                      {detail.rhpUrl ? (
                        <a href={detail.rhpUrl} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">
                          RHP
                        </a>
                      ) : null}
                    </AccordionContent>
                  </AccordionItem>
                ) : null}
                <AccordionItem value="ipo-intel">
                  <AccordionTrigger>IPO intelligence</AccordionTrigger>
                  <AccordionContent>
                    {ipoId ? <IpoIntelligencePanel ipoId={ipoId} /> : null}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="drhp-ai">
                  <AccordionTrigger className="items-center">
                    <span className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                      <span>Prospectus summary</span>
                      {summary ? (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            summary.mode === "ai"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {summary.mode === "ai" ? "AI" : "Rules fallback"}
                        </span>
                      ) : null}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Condensed DRHP/RHP view: issue context, financials to verify, management, outlook, and what to
                      check before applying. Not a rating or advice.
                    </p>

                    {!summary && !summaryLoading ? (
                      <button
                        type="button"
                        onClick={() => void loadSummary()}
                        disabled={summaryLoading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60 sm:w-auto"
                      >
                        <Sparkles className="size-3.5" />
                        Generate summary from DRHP/RHP
                      </button>
                    ) : null}

                    {summaryLoading ? (
                      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                        <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
                        Reading prospectus extract and building summary…
                      </div>
                    ) : null}

                    {summaryError ? (
                      <p className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-700">
                        {summaryError}
                      </p>
                    ) : null}

                    {summary ? (
                      <div className="space-y-3">
                        {(summary.extractError || summary.extractChars < 400) && (
                          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                            {summary.extractError
                              ? `Prospectus text limited: ${summary.extractError}. Summary leans on IPO calendar metadata.`
                              : "Short prospectus extract — open the PDF for full financial and risk sections."}
                          </p>
                        )}

                        <SummaryBlock title="Overview" body={summary.overview} />
                        <SummaryBlock title="Five-year financials" body={summary.fiveYearFinancials} />
                        <SummaryBlock title="Management" body={summary.management} />
                        <SummaryBlock title="Outlook" body={summary.outlook} />
                        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Key findings
                          </p>
                          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-foreground">
                            {summary.keyFindings.map((f) => (
                              <li key={f}>{f}</li>
                            ))}
                          </ul>
                        </div>
                        <SummaryBlock title="What to verify before applying" body={summary.decisionOverview} />
                        <p className="text-xs leading-relaxed text-muted-foreground">{summary.disclaimer}</p>
                        <div className="flex flex-wrap items-center gap-3">
                          {summary.sourceUrl ? (
                            <a
                              href={summary.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-primary hover:underline"
                            >
                              Open DRHP/RHP PDF →
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void loadSummary()}
                            disabled={summaryLoading}
                            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                          >
                            Regenerate
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryBlock({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
