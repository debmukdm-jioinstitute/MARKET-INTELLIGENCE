import { callLlmJson, hasLlmKey, untrustedBlock } from "@/lib/ai/llm";
import type { IpoDetail } from "@/lib/feeds/ipo/types";
import { fetchProspectusText } from "@/lib/feeds/ipo/extract-prospectus-text";

export type DrhpSummary = {
  overview: string;
  fiveYearFinancials: string;
  management: string;
  outlook: string;
  keyFindings: string[];
  decisionOverview: string;
  disclaimer: string;
  sourceUrl: string | null;
  generatedAt: string;
  mode: "ai" | "rules";
  extractChars: number;
  extractError?: string;
};

const DISCLAIMER =
  "Not investment advice. Grey-market and prospectus summaries can be incomplete or outdated — read the full DRHP/RHP and do your own research.";

function rulesSummary(detail: IpoDetail, sourceUrl: string | null, extractChars: number, extractError?: string): DrhpSummary {
  const band = `${detail.minPrice}–${detail.maxPrice}`;
  const exchange = detail.listingExchange ?? "NSE/BSE";
  const bidding =
    detail.biddingStartDate && detail.biddingEndDate
      ? ` Bidding window ${detail.biddingStartDate} to ${detail.biddingEndDate}.`
      : "";
  const sub = detail.totalSubscription ? ` Latest subscription ${detail.totalSubscription}x.` : "";

  const findings = [
    `Issue size about ₹${detail.issueSize} Cr; price band ₹${band}; lot size ${detail.lotSize?.toLocaleString("en-IN") ?? "see prospectus"}.`,
    detail.industry ? `Sector: ${detail.industry}.` : "Sector not listed on the calendar feed — confirm in the prospectus.",
    detail.gmpInr != null
      ? `Unofficial grey-market premium ≈ ₹${detail.gmpInr}${detail.gmpPct != null ? ` (~${detail.gmpPct}% vs band mid)` : ""} — not exchange-traded.`
      : "Grey market premium unavailable; do not treat social media GMP as official.",
    sourceUrl
      ? "Open the linked DRHP/RHP for audited financials, promoter table, and risk factors."
      : "No prospectus URL on this card yet — use SEBI or exchange issue page.",
  ];
  return {
    overview: `${detail.name} (${detail.symbol}) is ${detail.status.toLowerCase()} on the ${exchange} IPO calendar. Issue size ₹${detail.issueSize} Cr with band ₹${band}.${bidding}${sub} This summary uses calendar metadata${extractChars > 400 ? " plus a partial prospectus extract" : ""}; verify numbers in the official DRHP/RHP.`,
    fiveYearFinancials:
      extractChars > 400
        ? "Financial tables were present in the prospectus extract but could not be summarized without the AI key — open the DRHP for audited five-year figures."
        : "Five-year financials are in the DRHP/RHP (revenue, PAT, margins, leverage). Open the prospectus link for audited numbers.",
    management:
      "Promoter and key managerial personnel details, including experience and related-party disclosures, are in the prospectus “Our Management” / “Our Promoters” sections.",
    outlook:
      "Use the Objects of the Issue, industry overview, and risk factors in the DRHP to judge growth drivers and constraints — this calendar card does not forecast listing performance.",
    keyFindings: findings,
    decisionOverview:
      "Treat GMP as an unofficial signal only. Cross-check subscription trends, peer valuations, promoter dilution, and use of proceeds before applying. Prefer the RHP if both documents exist.",
    disclaimer: DISCLAIMER,
    sourceUrl,
    generatedAt: new Date().toISOString(),
    mode: "rules",
    extractChars,
    extractError,
  };
}

const SYSTEM = `You summarize Indian IPO draft/red herring prospectuses for retail investors.
Rules:
- Use ONLY facts present in <ipo_meta> and <prospectus_extract>. Never invent financials, names, or forecasts.
- If a section lacks evidence, say so briefly instead of guessing.
- No buy/sell recommendation; decisionOverview should help the reader decide what to verify next.
- Keep each prose field 2–4 complete sentences (roughly 400–700 characters max); keyFindings 4–6 short bullets ending with punctuation.
Return JSON:
{
  "overview": string,
  "fiveYearFinancials": string,
  "management": string,
  "outlook": string,
  "keyFindings": string[],
  "decisionOverview": string
}`;

export async function buildDrhpSummary(detail: IpoDetail): Promise<DrhpSummary> {
  const sourceUrl = detail.drhpUrl || detail.rhpUrl || null;
  let extractChars = 0;
  let extractError: string | undefined;
  let prospectusText = "";

  if (sourceUrl) {
    const fetched = await fetchProspectusText(sourceUrl);
    prospectusText = fetched.text;
    extractChars = prospectusText.length;
    extractError = fetched.error;
  } else {
    extractError = "No DRHP/RHP URL on this IPO";
  }

  if (!hasLlmKey()) {
    return rulesSummary(detail, sourceUrl, extractChars, extractError);
  }

  try {
    const meta = [
      `name=${detail.name}`,
      `symbol=${detail.symbol}`,
      `status=${detail.status}`,
      `industry=${detail.industry}`,
      `issueSizeCr=${detail.issueSize}`,
      `priceBand=${detail.minPrice}-${detail.maxPrice}`,
      `lotSize=${detail.lotSize ?? "n/a"}`,
      `subscription=${detail.totalSubscription ?? "n/a"}`,
      `gmpInr=${detail.gmpInr ?? "n/a"}`,
      `gmpPct=${detail.gmpPct ?? "n/a"}`,
      `bidding=${detail.biddingStartDate} to ${detail.biddingEndDate}`,
    ].join("\n");

    const out = await callLlmJson<{
      overview?: string;
      fiveYearFinancials?: string;
      management?: string;
      outlook?: string;
      keyFindings?: string[];
      decisionOverview?: string;
    }>({
      system: SYSTEM,
      maxTokens: 1200,
      prompt: [
        untrustedBlock("ipo_meta", meta),
        untrustedBlock(
          "prospectus_extract",
          prospectusText.slice(0, 28_000) || "(no extract — summarize only from ipo_meta and say what to check in the DRHP)",
        ),
      ].join("\n\n"),
    });

    const findings = Array.isArray(out.keyFindings)
      ? out.keyFindings.map((f) => String(f).slice(0, 220)).filter(Boolean).slice(0, 6)
      : [];

    return {
      overview: String(out.overview ?? "").trim().slice(0, 720) || rulesSummary(detail, sourceUrl, extractChars).overview,
      fiveYearFinancials:
        String(out.fiveYearFinancials ?? "").trim().slice(0, 720) ||
        rulesSummary(detail, sourceUrl, extractChars).fiveYearFinancials,
      management: String(out.management ?? "").trim().slice(0, 720) || rulesSummary(detail, sourceUrl, extractChars).management,
      outlook: String(out.outlook ?? "").trim().slice(0, 720) || rulesSummary(detail, sourceUrl, extractChars).outlook,
      keyFindings: findings.length ? findings : rulesSummary(detail, sourceUrl, extractChars).keyFindings,
      decisionOverview:
        String(out.decisionOverview ?? "").trim().slice(0, 720) ||
        rulesSummary(detail, sourceUrl, extractChars).decisionOverview,
      disclaimer: DISCLAIMER,
      sourceUrl,
      generatedAt: new Date().toISOString(),
      mode: "ai",
      extractChars,
      extractError,
    };
  } catch {
    return rulesSummary(detail, sourceUrl, extractChars, extractError ?? "AI summary failed");
  }
}
