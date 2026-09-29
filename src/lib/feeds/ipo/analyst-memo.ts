import { callLlmJson, hasLlmKey, untrustedBlock } from "@/lib/ai/llm";
import { fetchProspectusText } from "@/lib/feeds/ipo/extract-prospectus-text";
import type { IpoAnalystMemo } from "@/lib/feeds/ipo/intelligence-types";
import { parseProspectusText } from "@/lib/feeds/ipo/prospectus-parse";
import type { IpoDetail } from "@/lib/feeds/ipo/types";

const DISCLAIMER =
  "Educational synthesis only — not investment advice, not a research rating, and not from a SEBI-registered analyst. Verify every number in the DRHP/RHP before applying.";

function rulesMemo(detail: IpoDetail, extractChars: number, prospectusText = ""): IpoAnalystMemo {
  const band = `${detail.minPrice}–${detail.maxPrice}`;
  const parsed = parseProspectusText(prospectusText);
  return {
    headline: `${detail.name} — primary market dossier (rules-based)`,
    investmentThesis: `${detail.name} (${detail.industry}) is ${detail.status} with a ₹${band} band and ₹${detail.issueSize} Cr issue. Thesis must come from Objects of the Issue, industry growth, and margin trajectory in the DRHP — not inferred here.`,
    strengths: [
      detail.totalSubscription ? `Subscription reported at ${detail.totalSubscription}x on the calendar feed.` : "Check live QIB/HNI/retail split on NSE/BSE during the issue.",
      detail.drhpUrl || detail.rhpUrl ? "Prospectus linked — use audited financials and peer tables there." : "Obtain DRHP/RHP from SEBI or exchange issue page.",
      detail.gmpInr != null ? `Unofficial GMP ≈ ₹${detail.gmpInr} — treat as sentiment only.` : "GMP unavailable; do not anchor valuation to grey market.",
    ],
    risks: parsed.riskBullets.length
      ? parsed.riskBullets.slice(0, 5)
      : [
          "Read Risk Factors in full — regulatory, customer concentration, and working-capital risks are issuer-specific.",
          "Promoter dilution / OFS mix affects float and near-term supply — confirm fresh issue vs OFS in the prospectus.",
          "Listing-day volatility can diverge sharply from GMP and subscription hype.",
        ],
    valuationView: `Price band implies issuer-requested valuation. Reconcile P/E, EV/EBITDA, and P/B vs peers in the Industry Overview; cut-off ${detail.cutOffPrice ?? "TBD"}.`,
    peerComparison: `Compare ${detail.industry} peers on revenue CAGR, ROE, and leverage — tables are in the DRHP/RHP, not auto-crawled yet.`,
    subscriptionAndListingView: detail.timeline.listingDate
      ? `Listing targeted ${detail.timeline.listingDate}. Post-listing, track price vs issue price and index beta.`
      : "Watch subscription build-up and anchor allocation news on exchange filings.",
    diligenceChecklist: [
      "Objects of the Issue vs capex/working-capital needs",
      "Related-party transactions and promoter group",
      "Contingent liabilities and legal proceedings",
      "Peer valuation table and basis for issue price",
      "Use of proceeds and dilution math",
    ],
    disclaimer: DISCLAIMER,
    generatedAt: new Date().toISOString(),
    mode: "rules",
    prospectusExtractChars: extractChars,
  };
}

const SYSTEM = `You are an equity research analyst drafting an IPO note for Indian primary markets.
Rules:
- Use ONLY <ipo_meta> and <prospectus_extract>. Never invent financials, peer multiples, or subscription numbers.
- Tone: institutional research (thesis, strengths, risks, valuation, peers, listing view) but NO buy/sell/hold rating and NO target price unless explicitly in the extract.
- If data missing, say what to verify in DRHP/RHP/exchange filings.
Return JSON:
{
  "headline": string,
  "investmentThesis": string,
  "strengths": string[],
  "risks": string[],
  "valuationView": string,
  "peerComparison": string,
  "subscriptionAndListingView": string,
  "diligenceChecklist": string[]
}`;

export async function buildIpoAnalystMemo(detail: IpoDetail): Promise<IpoAnalystMemo> {
  const sourceUrl = detail.drhpUrl || detail.rhpUrl || null;
  let prospectusText = "";
  let extractChars = 0;
  if (sourceUrl) {
    const fetched = await fetchProspectusText(sourceUrl);
    prospectusText = fetched.text;
    extractChars = prospectusText.length;
  }

  if (!hasLlmKey()) {
    return rulesMemo(detail, extractChars, prospectusText);
  }

  const meta = [
    `name=${detail.name}`,
    `symbol=${detail.symbol}`,
    `status=${detail.status}`,
    `industry=${detail.industry}`,
    `issueSizeCr=${detail.issueSize}`,
    `priceBand=${detail.minPrice}-${detail.maxPrice}`,
    `cutOff=${detail.cutOffPrice ?? "n/a"}`,
    `lotSize=${detail.lotSize ?? "n/a"}`,
    `subscription=${detail.totalSubscription ?? "n/a"}`,
    `gmpInr=${detail.gmpInr ?? "n/a"}`,
    `gmpPct=${detail.gmpPct ?? "n/a"}`,
    `listingPrice=${detail.listingPrice ?? "n/a"}`,
    `bidding=${detail.biddingStartDate} to ${detail.biddingEndDate}`,
    `listingDate=${detail.timeline.listingDate ?? "n/a"}`,
  ].join("\n");

  try {
    const out = await callLlmJson<{
      headline?: string;
      investmentThesis?: string;
      strengths?: string[];
      risks?: string[];
      valuationView?: string;
      peerComparison?: string;
      subscriptionAndListingView?: string;
      diligenceChecklist?: string[];
    }>({
      system: SYSTEM,
      maxTokens: 1600,
      prompt: [
        untrustedBlock("ipo_meta", meta),
        untrustedBlock(
          "prospectus_extract",
          prospectusText.slice(0, 32_000) ||
            "(no extract — write a diligence framework only; cite ipo_meta)",
        ),
      ].join("\n\n"),
    });

    const pickList = (arr: unknown, max: number) =>
      Array.isArray(arr)
        ? arr.map((x) => String(x).slice(0, 320)).filter(Boolean).slice(0, max)
        : [];

    const fallback = rulesMemo(detail, extractChars, prospectusText);
    return {
      headline: String(out.headline ?? fallback.headline).slice(0, 200),
      investmentThesis: String(out.investmentThesis ?? fallback.investmentThesis).slice(0, 900),
      strengths: pickList(out.strengths, 6).length ? pickList(out.strengths, 6) : fallback.strengths,
      risks: pickList(out.risks, 6).length ? pickList(out.risks, 6) : fallback.risks,
      valuationView: String(out.valuationView ?? fallback.valuationView).slice(0, 700),
      peerComparison: String(out.peerComparison ?? fallback.peerComparison).slice(0, 700),
      subscriptionAndListingView: String(
        out.subscriptionAndListingView ?? fallback.subscriptionAndListingView,
      ).slice(0, 700),
      diligenceChecklist: pickList(out.diligenceChecklist, 8).length
        ? pickList(out.diligenceChecklist, 8)
        : fallback.diligenceChecklist,
      disclaimer: DISCLAIMER,
      generatedAt: new Date().toISOString(),
      mode: "ai",
      prospectusExtractChars: extractChars,
    };
  } catch {
    return rulesMemo(detail, extractChars, prospectusText);
  }
}
