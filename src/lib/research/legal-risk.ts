import type { RatingEvent } from "./ratings";

/**
 * "What could go wrong" checklist. Every row is a published fact (a SEBI order
 * title, a company filing's NSE category, a rating action) with a link to its
 * document. Explanations are fixed plain-English templates about what KIND of
 * document it is — we never state what an order or filing means for the company.
 */

export type RiskSeverity = "high" | "review" | "info";
export type RiskItem = {
  id: string;
  label: string;
  severity: RiskSeverity;
  explanation: string;
  date: string; // YYYY-MM-DD
  link: string | null;
  source: "SEBI" | "NSE filing" | "Rating agency" | "NSE filing (AI-tagged)";
  quote: string | null; // the document's own title/headline, shown in quotation marks
};

export type SebiRow = { id: string; eventType: string | null; title: string; eventDate: string; documentUrl: string | null };
export type FilingRow = { id: string; headline: string; category: string; broadcastDate: string; attachmentUrl: string | null; taxonomyLabels: string[] | null };

export const NCLT_SEARCH_URL = "https://nclt.gov.in/order-date-wise";
const RANK: Record<RiskSeverity, number> = { high: 0, review: 1, info: 2 };

/** NSE category (assigned by our allow-list from the exchange's own category names) → checklist template. */
const FILING_TEMPLATES: Record<string, { label: string; severity: RiskSeverity; explanation: string }> = {
  "Default / delay": { label: "Default or delay in a filing", severity: "high", explanation: "The company's own exchange filing was categorised as a default or a delay. Open the filing to see what it covers." },
  "Fraud / forensic audit": { label: "Fraud or forensic-audit mention", severity: "high", explanation: "A filing mentions fraud or a forensic audit. A mention is not a finding — open the filing to read the context." },
  "Regulatory / legal action": { label: "Legal or regulatory matter", severity: "review", explanation: "A filing concerns a legal or regulatory matter (a case, dispute, insolvency step or an order). Open it to see which." },
  "Auditor change": { label: "Auditor change", severity: "review", explanation: "A filing concerns the company's auditor (for example a resignation or a qualified report). Open it to see which." },
};

/** AI taxonomy labels we surface as "info" only — they are automatic tags, so the row says so. */
const TAXONOMY_RISK: Record<string, string> = {
  litigation: "Legal case",
  "regulatory-action": "Regulatory action",
  "auditor-qualification": "Auditor qualification",
  "related-party": "Related-party dealings",
  "default/delay": "Default or delay",
  "fraud-allegation": "Fraud allegation",
  pledge: "Share pledging",
};

const ratingLabel = (t: RatingEvent["type"]) => (t === "downgrade" ? "Credit rating downgrade" : t === "watch-negative" ? "Negative credit watch" : "Negative rating outlook");

export function buildRiskChecklist(input: { sebi: SebiRow[]; filings: FilingRow[]; ratingEvents: RatingEvent[] }): RiskItem[] {
  const items: RiskItem[] = [];

  for (const s of input.sebi) {
    items.push({
      id: `sebi-${s.id}`,
      label: s.eventType ?? "SEBI order",
      severity: "review",
      explanation: "SEBI published an order that names this company. The title is quoted — open the order to read what it actually says.",
      date: s.eventDate,
      link: s.documentUrl,
      source: "SEBI",
      quote: s.title,
    });
  }

  for (const f of input.filings) {
    const t = FILING_TEMPLATES[f.category];
    if (t) {
      items.push({ id: `nse-${f.id}`, label: t.label, severity: t.severity, explanation: t.explanation, date: f.broadcastDate, link: f.attachmentUrl, source: "NSE filing", quote: f.headline });
      continue;
    }
    const tags = (f.taxonomyLabels ?? []).filter((l) => l in TAXONOMY_RISK);
    if (tags.length) {
      items.push({
        id: `nse-ai-${f.id}`,
        label: tags.map((l) => TAXONOMY_RISK[l]).join(" / "),
        severity: "info",
        explanation: "An automatic tagger flagged this filing as possibly related to this topic. It can be wrong — open the filing and judge for yourself.",
        date: f.broadcastDate,
        link: f.attachmentUrl,
        source: "NSE filing (AI-tagged)",
        quote: f.headline,
      });
    }
  }

  for (const e of input.ratingEvents) {
    if (e.type === "disclosure") continue;
    items.push({
      id: `rating-${e.agency}-${e.date}-${e.type}`,
      label: ratingLabel(e.type),
      severity: e.type === "negative-outlook" ? "review" : "high",
      explanation: "A credit rating agency took this action. Ratings are the agency's own opinion about the company's ability to repay debt.",
      date: e.date,
      link: e.link,
      source: "Rating agency",
      quote: e.detail,
    });
  }

  return items.sort((a, b) => RANK[a.severity] - RANK[b.severity] || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
