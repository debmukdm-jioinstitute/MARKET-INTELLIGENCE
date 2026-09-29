"use client";

import type { IpoAnalystMemo, IpoIntelField, IpoIntelligence } from "@/lib/feeds/ipo/intelligence-types";
import { fmtInr } from "@/lib/format-india";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

function Coverage({ c }: { c: IpoIntelField<unknown>["coverage"] }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
        c === "live" && "bg-emerald-500/15 text-emerald-700",
        c === "partial" && "bg-amber-500/15 text-amber-800",
        c === "planned" && "bg-muted text-muted-foreground",
      )}
    >
      {c}
    </span>
  );
}

function Row({
  label,
  field,
  children,
}: {
  label: string;
  field: IpoIntelField<unknown>;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/50 py-2 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <Coverage c={field.coverage} />
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      {field.note ? <p className="mt-1 text-[11px] text-muted-foreground/90">{field.note}</p> : null}
    </div>
  );
}

export function IpoIntelligencePanel({ ipoId }: { ipoId: string }) {
  const [intel, setIntel] = useState<IpoIntelligence | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [memo, setMemo] = useState<IpoAnalystMemo | null>(null);
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoError, setMemoError] = useState<string | null>(null);

  useEffect(() => {
    setIntel(null);
    setMemo(null);
    setIntelError(null);
    setMemoError(null);
  }, [ipoId]);

  const loadIntel = async () => {
    if (intelLoading) return;
    setIntelLoading(true);
    setIntelError(null);
    try {
      const res = await fetch(`/api/feeds/ipo/${encodeURIComponent(ipoId)}/intelligence`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setIntel(json as IpoIntelligence);
    } catch (e) {
      setIntelError(e instanceof Error ? e.message : "Intelligence load failed");
    } finally {
      setIntelLoading(false);
    }
  };

  const loadAnalyst = async () => {
    if (memoLoading) return;
    setMemoLoading(true);
    setMemoError(null);
    try {
      const res = await fetch("/api/ai/ipo-analyst", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ipoId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMemo(json as IpoAnalystMemo);
    } catch (e) {
      setMemoError(e instanceof Error ? e.message : "Analyst memo failed");
    } finally {
      setMemoLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void loadIntel()}
          disabled={intelLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted/50 disabled:opacity-60"
        >
          {intelLoading ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {intel ? "Refresh IPO intelligence" : "Build IPO intelligence dossier"}
        </button>
        <button
          type="button"
          onClick={() => void loadAnalyst()}
          disabled={memoLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
        >
          {memoLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Analyse this IPO like an equity research analyst
        </button>
      </div>

      {intelError ? <p className="text-sm text-rose-600">{intelError}</p> : null}
      {memoError ? <p className="text-sm text-rose-600">{memoError}</p> : null}

      {intel ? (
        <div className="rounded-lg border border-border bg-card/50 px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">IPO intelligence tree</p>
          <div className="mt-2 font-sans">
            <Row label="DRHP" field={intel.drhp}>
              {intel.drhp.value.url ? (
                <a href={intel.drhp.value.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Open DRHP
                </a>
              ) : (
                "—"
              )}
            </Row>
            <Row label="RHP" field={intel.rhp}>
              {intel.rhp.value.url ? (
                <a href={intel.rhp.value.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Open RHP
                </a>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Issue size" field={intel.issueSize}>
              ₹{intel.issueSize.value} Cr
            </Row>
            <Row label="Fresh issue" field={intel.freshIssue}>
              {intel.freshIssue.value != null ? `₹${intel.freshIssue.value} Cr (extract)` : "—"}
            </Row>
            <Row label="OFS" field={intel.ofs}>
              {intel.ofs.value != null ? `₹${intel.ofs.value} Cr (extract)` : "—"}
            </Row>
            <Row label="Promoters" field={intel.promoters}>
              {intel.promoters.value ? (
                <span className="line-clamp-4">{intel.promoters.value}</span>
              ) : (
                "See DRHP promoters section"
              )}
            </Row>
            <Row label="Valuation" field={intel.valuation}>
              {intel.valuation.value ? <span className="line-clamp-3">{intel.valuation.value}</span> : "—"}
            </Row>
            <Row label="Peer valuation" field={intel.peerValuation}>
              {intel.peerValuation.value ? <span className="line-clamp-3">{intel.peerValuation.value}</span> : "—"}
            </Row>
            <Row label="Financials" field={intel.financials}>
              {intel.financials.value ? <span className="line-clamp-3">{intel.financials.value}</span> : "—"}
            </Row>
            <Row label="Risks" field={intel.risks}>
              {intel.risks.value.length ? (
                <ul className="list-disc pl-4 space-y-1">
                  {intel.risks.value.map((r) => (
                    <li key={r.slice(0, 40)}>{r}</li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Objects of issue" field={intel.objectsOfIssue}>
              {intel.objectsOfIssue.value.length ? (
                <ul className="list-disc pl-4 space-y-1">
                  {intel.objectsOfIssue.value.map((r) => (
                    <li key={r.slice(0, 40)}>{r}</li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Anchor investors" field={intel.anchorInvestors}>
              {intel.anchorInvestors.value ? (
                <span className="line-clamp-3">{intel.anchorInvestors.value}</span>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Subscription" field={intel.subscription}>
              {intel.subscription.value ?? "—"}
            </Row>
            <Row label="GMP*" field={intel.gmp}>
              {intel.gmp.value ? (
                <>
                  {intel.gmp.value.gmpInr != null
                    ? `${intel.gmp.value.gmpInr > 0 ? "+" : ""}${fmtInr(intel.gmp.value.gmpInr)}`
                    : "—"}
                  {intel.gmp.value.gmpPct != null ? ` (${intel.gmp.value.gmpPct}%)` : ""}
                  <p className="mt-1 text-[11px]">{intel.gmp.value.disclaimer}</p>
                </>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Listing performance" field={intel.listingPerformance}>
              {intel.listingPerformance.value ? (
                <>
                  List {fmtInr(intel.listingPerformance.value.listingPrice ?? 0)}
                  {intel.listingPerformance.value.listingGainPct != null
                    ? ` · ${intel.listingPerformance.value.listingGainPct > 0 ? "+" : ""}${intel.listingPerformance.value.listingGainPct}% vs issue ref`
                    : null}
                </>
              ) : (
                "—"
              )}
            </Row>
          </div>
          {intel.prospectusError ? (
            <p className="mt-2 text-[11px] text-amber-700">Prospectus: {intel.prospectusError}</p>
          ) : null}
          <div className="mt-3 border-t border-border/60 pt-2">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Source crawl map</p>
            <ul className="mt-1 space-y-1">
              {intel.sourceCatalog.map((s) => (
                <li key={s.id} className="text-xs">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    {s.label}
                    <ExternalLink className="size-3" />
                  </a>
                  <span className="text-muted-foreground"> — {s.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {memo ? (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="font-bold text-foreground">{memo.headline}</p>
          <MemoBlock title="Investment thesis" body={memo.investmentThesis} />
          <MemoList title="Strengths" items={memo.strengths} />
          <MemoList title="Risks" items={memo.risks} />
          <MemoBlock title="Valuation view" body={memo.valuationView} />
          <MemoBlock title="Peer comparison" body={memo.peerComparison} />
          <MemoBlock title="Subscription & listing" body={memo.subscriptionAndListingView} />
          <MemoList title="Diligence checklist" items={memo.diligenceChecklist} />
          <p className="text-xs text-muted-foreground">{memo.disclaimer}</p>
          <p className="text-[11px] text-muted-foreground">
            Mode: {memo.mode} · prospectus chars: {memo.prospectusExtractChars.toLocaleString("en-IN")}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function MemoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 leading-relaxed">{body}</p>
    </div>
  );
}

function MemoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {items.map((x) => (
          <li key={x.slice(0, 48)}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
