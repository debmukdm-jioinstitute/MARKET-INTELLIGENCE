"use client";

import { Panel } from "@/components/layout/page-header";
import { STAGE_LABEL, STAGES, type Momentum, type StageId } from "@/lib/research/ipos";
import { fmtInr } from "@/lib/format-india";
import { cn } from "@/lib/utils";
import { useState } from "react";
import useSWR from "swr";
import { signClass } from "@/lib/sign-color";

type OfferCover = { freshIssueCr: number | null; freshShares?: number | null; totalShares?: number | null; ofsShares: number | null; ofsCr: number | null; totalOfferCr: number | null; structure: "fresh" | "ofs" | "fresh+ofs" | null };

type Ipo = {
  company: string;
  symbol: string | null;
  board: string | null;
  stage: StageId;
  issueSizeCr: number | null;
  priceBand: { low: number | null; high: number | null };
  dates: { open: string | null; close: string | null; allotment: string | null; listing: string | null };
  brlms: string[];
  prospectusUrl: string | null;
  topRisks: string[];
  objects: { objects?: { title: string; category: string }[]; freshIssueMillions?: number | null; hasOfferForSale?: boolean; offer?: OfferCover } | null;
  subscription: Momentum & { series: unknown[] };
  apply: { lotSize: number | null; minInvestmentInr: number | null };
  gmp: { value: number | null; low: number | null; high: number | null; pct: number | null; sources: string[]; updatedAt: string | null; disagree: boolean } | null;
};
type IposResponse = { dbConfigured: boolean; counts: Record<string, number>; ipos: Ipo[]; gmpDisclaimer: string; gmpExplainerUrl: string };

/** Module-level fetcher — never inline an async fn in useSWR (React #185). */
async function loadIpos(url: string): Promise<IposResponse> {
  const res = await fetch(url);
  const json = (await res.json()) as IposResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

const fmtDay = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" }) : "—");
const CATEGORY_LABEL: Record<string, string> = { capex: "Building / equipment", "debt-repayment": "Paying down debt", "working-capital": "Day-to-day working capital", ofs: "Existing holders selling", "general-corporate": "General corporate use", other: "Other" };


const cr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })} cr`;
const shares = (n: number) => `${n.toLocaleString("en-IN")} shares`;

/** What a DRHP actually states about the offer: fresh issue, offer for sale, both. Unstated parts are left out, never guessed. */
function offerStructure(offer: OfferCover | undefined): string | null {
  if (!offer?.structure) return null;
  const parts: string[] = [];
  if (offer.structure !== "ofs") parts.push(offer.freshIssueCr !== null ? `Fresh issue up to ${cr(offer.freshIssueCr)}` : offer.freshShares != null ? `Fresh issue up to ${shares(offer.freshShares)}` : "Fresh issue (size set at RHP)");
  if (offer.structure !== "fresh") parts.push(offer.ofsCr !== null ? `Offer for sale up to ${cr(offer.ofsCr)}` : offer.ofsShares !== null ? `Offer for sale up to ${shares(offer.ofsShares)}` : "Offer for sale");
  return parts.join(" + ");
}

function Meter({ label, x, delta }: { label: string; x: number | null; delta: number | null | undefined }) {
  if (x === null) return null;
  const width = Math.min(x, 2) / 2; // 0..2× fills the bar; the tick marks 1× (fully subscribed)
  return (
    <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="relative h-2 rounded-full bg-muted">
        <div className={cn("h-2 rounded-full", x >= 1 ? "bg-emerald-500" : "bg-primary/60")} style={{ width: `${(width * 100).toFixed(1)}%` }} />
        <span className="absolute top-[-2px] h-3 w-px bg-foreground/60" style={{ left: "50%" }} aria-hidden />
      </div>
      <span className="tabular-nums text-foreground">
        {x.toFixed(2)}×{delta != null ? <span className={cn("ml-1", delta >= 0 ? "text-emerald-700" : "text-rose-700")}>{delta >= 0 ? "+" : ""}{delta.toFixed(2)}</span> : null}
      </span>
    </div>
  );
}

function GmpGauge({ gmp, disclaimer, explainer }: { gmp: NonNullable<Ipo["gmp"]>; disclaimer: string; explainer: string }) {
  const pct = gmp.pct === null ? 0 : Math.max(-50, Math.min(50, gmp.pct));
  return (
    <div className="space-y-1.5 rounded-md border border-border p-2.5">
      <p className="text-xs font-semibold text-foreground">Grey-market premium (sentiment only)</p>
      {gmp.disagree ? (
        <p className="text-sm text-foreground">
          ₹{gmp.low} to ₹{gmp.high} <span className="text-xs text-muted-foreground">— sources disagree, so we show the range</span>
        </p>
      ) : (
        <p className="text-sm text-foreground">
          {gmp.value === null ? "—" : `₹${gmp.value}`}
          {gmp.pct !== null ? <span className={cn("ml-1 text-xs", signClass(gmp.pct))}>({gmp.pct >= 0 ? "+" : ""}{gmp.pct}% of upper price)</span> : null}
        </p>
      )}
      {!gmp.disagree && gmp.pct !== null ? (
        <div className="relative h-2 rounded-full bg-muted" aria-hidden>
          <span className="absolute left-1/2 top-[-2px] h-3 w-px bg-foreground/60" />
          <div className={cn("absolute top-0 h-2 rounded-full", pct >= 0 ? "bg-amber-400" : "bg-rose-400")} style={pct >= 0 ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${-pct}%` }} />
        </div>
      ) : null}
      <p className="rounded bg-amber-50 px-2 py-1 text-[11px] leading-snug text-amber-900">
        {disclaimer}{" "}
        <a href={explainer} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
          What is grey market? ↗
        </a>
      </p>
      <p className="text-[11px] text-muted-foreground">Sources: {gmp.sources.join(" + ") || "—"}{gmp.updatedAt ? ` · ${new Date(gmp.updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata", hour12: false })} IST` : ""}</p>
    </div>
  );
}

function IpoCard({ ipo, disclaimer, explainer }: { ipo: Ipo; disclaimer: string; explainer: string }) {
  const [open, setOpen] = useState(false);
  const sub = ipo.subscription;
  const live = ipo.stage === "open" && sub.latest;
  const hasDetail = ipo.topRisks.length > 0 || (ipo.objects?.objects?.length ?? 0) > 0;
  return (
    <li className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{ipo.company}</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{STAGE_LABEL[ipo.stage]}</span>
        {ipo.board === "SME" ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">SME</span> : null}
        {sub.heatingUp ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">Retail demand heating up</span> : null}
      </div>
      {ipo.stage === "drhp_filed" ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
          <div className="col-span-2"><dt className="text-muted-foreground">Offer structure (from the DRHP)</dt><dd className="text-foreground">{offerStructure(ipo.objects?.offer) ?? "Being read from the prospectus"}</dd></div>
          <div><dt className="text-muted-foreground">Issue size</dt><dd className="text-foreground">{ipo.issueSizeCr !== null ? `₹${ipo.issueSizeCr.toLocaleString("en-IN")} cr` : ipo.objects?.offer?.freshIssueCr != null ? `At least ${cr(ipo.objects.offer.freshIssueCr)}` : "Fixed at RHP"}</dd></div>
          <div><dt className="text-muted-foreground">Lead managers</dt><dd className="text-foreground">{ipo.brlms.length ? ipo.brlms.join(", ") : "Being read from the prospectus"}</dd></div>
          <div className="col-span-2 sm:col-span-4"><dd className="text-muted-foreground">Price band and bidding dates are announced only after SEBI clears the issue and the RHP is filed.</dd></div>
        </dl>
      ) : (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div><dt className="text-muted-foreground">Issue size</dt><dd className="text-foreground">{ipo.issueSizeCr !== null ? `₹${ipo.issueSizeCr.toLocaleString("en-IN")} cr` : "—"}</dd></div>
        <div><dt className="text-muted-foreground">Price band</dt><dd className="text-foreground">{ipo.priceBand.high !== null ? (ipo.priceBand.low !== ipo.priceBand.high ? `${fmtInr(ipo.priceBand.low)}–${fmtInr(ipo.priceBand.high)}` : fmtInr(ipo.priceBand.high)) : "—"}</dd></div>
        <div><dt className="text-muted-foreground">Bidding</dt><dd className="text-foreground">{fmtDay(ipo.dates.open)} → {fmtDay(ipo.dates.close)}</dd></div>
        <div><dt className="text-muted-foreground">Lead managers</dt><dd className="text-foreground">{ipo.brlms.length ? ipo.brlms.join(", ") : "—"}</dd></div>
      </dl>
      )}

      {live ? (
        <div className="space-y-1.5 rounded-md border border-border p-2.5">
          <p className="text-xs font-semibold text-foreground">Live subscription (× = times the shares on offer; 1× = fully subscribed)</p>
          <Meter label="QIB" x={sub.latest!.qibX} delta={sub.delta?.qibX} />
          <Meter label="NII" x={sub.latest!.niiX} delta={sub.delta?.niiX} />
          <Meter label="Retail" x={sub.latest!.riiX} delta={sub.delta?.riiX} />
          <Meter label="Total" x={sub.latest!.totalX} delta={sub.delta?.totalX} />
          <p className="text-[11px] text-muted-foreground">Source: NSE · change shown versus about a day earlier when we have a snapshot.</p>
        </div>
      ) : null}

      {ipo.stage === "open" || ipo.stage === "sebi_nod" ? (
        <div className="rounded-md border border-border p-2.5 text-xs">
          <p className="mb-1 font-semibold text-foreground">Before you apply</p>
          <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
            <li>One lot = {ipo.apply.lotSize ?? "—"} shares{ipo.apply.minInvestmentInr !== null ? ` → minimum about ₹${ipo.apply.minInvestmentInr.toLocaleString("en-IN")} at the upper price` : ""}.</li>
            <li>Applications close {fmtDay(ipo.dates.close)}. Read the prospectus first{ipo.prospectusUrl ? "" : " (link not found yet)"}.</li>
          </ul>
        </div>
      ) : null}

      {ipo.gmp && ipo.stage !== "listed" ? <GmpGauge gmp={ipo.gmp} disclaimer={disclaimer} explainer={explainer} /> : null}

      <div className="flex flex-wrap items-center gap-3 text-xs">
        {ipo.prospectusUrl ? (
          <a href={ipo.prospectusUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            SEBI prospectus filing ↗
          </a>
        ) : null}
        {hasDetail ? (
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="font-semibold text-primary hover:underline">
            {open ? "Hide" : "Show"} risks and use of money
          </button>
        ) : null}
      </div>
      {open && hasDetail ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <h4 className="mb-1 text-xs font-semibold text-foreground">First risks the company lists (copied from the prospectus)</h4>
            {ipo.topRisks.length ? (
              <ol className="list-decimal space-y-1.5 pl-4 text-xs text-foreground">
                {ipo.topRisks.map((r) => (
                  <li key={r}>“{r}”</li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">Could not be read automatically — open the prospectus.</p>
            )}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-semibold text-foreground">Where the money goes (purposes the company lists)</h4>
            {ipo.objects?.objects?.length ? (
              <ul className="space-y-1 text-xs text-foreground">
                {ipo.objects.objects.map((o) => (
                  <li key={o.title}>
                    <span className="mr-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{CATEGORY_LABEL[o.category] ?? o.category}</span>“{o.title}”
                  </li>
                ))}
                {ipo.objects.freshIssueMillions ? <li className="text-muted-foreground">Fresh issue: up to ₹{ipo.objects.freshIssueMillions.toLocaleString("en-IN")} million{ipo.objects.hasOfferForSale ? ", plus an offer for sale by existing holders" : ""}.</li> : null}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Not listed in what we could read — open the prospectus.</p>
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}

/** IPO pipeline funnel: five stages, filterable cards, live subscription meters, apply checklist, GMP with a permanent disclaimer. */
export function IpoFunnelSection() {
  const [stage, setStage] = useState<StageId | "all">("open");
  const key = `/api/research/ipos?limit=40${stage === "all" ? "" : `&stage=${stage}`}`;
  const { data, error, isLoading } = useSWR<IposResponse>(key, loadIpos, { revalidateOnFocus: false, keepPreviousData: true });

  return (
    <Panel
      title="IPO pipeline"
      subtitle="From draft prospectus to listing day — what stage each issue is in, how well it is subscribed, and what the company says about risks."
      trust={{ source: "NSE IPO pages, SEBI public-issue filings, Chittorgarh / IPO Watch (GMP)", note: "Information only — not an invitation to apply" }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Pipeline stage">
          {STAGES.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              aria-pressed={stage === s}
              className={cn("rounded-lg border p-2.5 text-left transition-colors", stage === s ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted")}
            >
              <span className="block text-[11px] text-muted-foreground">Step {i + 1}</span>
              <span className="block text-sm font-semibold text-foreground">{STAGE_LABEL[s]}</span>
              <span className="block text-lg font-semibold tabular-nums text-primary">{data?.counts?.[s] ?? "–"}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setStage("all")} aria-pressed={stage === "all"} className={cn("text-xs font-semibold hover:underline", stage === "all" ? "text-foreground" : "text-primary")}>
          Show every stage
        </button>

        {data ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {data.gmpDisclaimer}{" "}
            <a href={data.gmpExplainerUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
              What is grey market? ↗
            </a>
          </p>
        ) : null}

        {isLoading && !data ? <p className="animate-pulse text-sm text-muted-foreground">Loading the IPO pipeline…</p> : null}
        {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Could not load the IPO pipeline right now. Try again in a moment.</p> : null}
        {data && !error && data.ipos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No IPOs in this stage right now.{data.dbConfigured ? "" : " (Database not configured on this deployment.)"}</p>
        ) : null}
        {data && data.ipos.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {data.ipos.map((i) => (
              <IpoCard key={i.company} ipo={i} disclaimer={data.gmpDisclaimer} explainer={data.gmpExplainerUrl} />
            ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  );
}
