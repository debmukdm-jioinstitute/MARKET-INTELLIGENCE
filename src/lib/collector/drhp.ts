/**
 * Draft/Red Herring Prospectus reading (pure functions over page text).
 * Extractive by design — risk headings are verbatim, object titles come from
 * the document's own cross-references — so nothing here can be invented.
 */

export type ObjectCategory = "capex" | "debt-repayment" | "working-capital" | "ofs" | "general-corporate" | "other";

export type ObjectsBreakdown = {
  /** Distinct "Objects of the Offer" items exactly as the document titles them. */
  objects: { title: string; category: ObjectCategory }[];
  /** Fresh-issue size in ₹ million when the summary states it. */
  freshIssueMillions: number | null;
  hasOfferForSale: boolean;
};

const CATEGORY_RULES: [ObjectCategory, RegExp][] = [
  ["general-corporate", /general corporate/i],
  ["debt-repayment", /repayment|prepayment|borrowings|redemption/i],
  ["working-capital", /working capital/i],
  ["ofs", /offer for sale|selling shareholder/i],
  ["capex", /capital expenditure|setting up|expansion|purchase of|construction|new (?:facility|plant|unit|branch)|plant and machinery|capacity|installation/i],
];

export const categorizeObject = (title: string): ObjectCategory => CATEGORY_RULES.find(([, re]) => re.test(title))?.[0] ?? "other";

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** Pages hold ‘Objects of the Offer – Details of the Object – <title>’ cross-references throughout; collect the distinct titles. */
export function extractObjects(pages: string[]): ObjectsBreakdown {
  const text = pages.join(" ");
  const titles = new Map<string, string>();
  for (const m of text.matchAll(/Objects?\s+of\s+the\s+(?:Offer|Issue)\s*[–—-]\s*(?:Details\s+of\s+the\s+Objects?\s*[–—-]\s*)?([^”"“]{12,220}?)[”"]/gi)) {
    const title = clean(m[1]).replace(/[\s,;:]+$/, "");
    if (/^(?:Details of the Objects?|Means of finance|Offer[- ]related expenses|Interim use|Monitoring|Key assumptions|Basis for|Proposed schedule|Schedule of)/i.test(title)) continue;
    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").slice(0, 80);
    if (!titles.has(key)) titles.set(key, title);
  }
  const objects = [...titles.values()].slice(0, 12).map((title) => ({ title, category: categorizeObject(title) }));
  const fresh = /Fresh Issue[^.₹]{0,80}(?:up to|aggregating(?: up to)?)\s*₹\s*([\d,]+(?:\.\d+)?)\s*million/i.exec(text);
  return {
    objects,
    freshIssueMillions: fresh ? Number(fresh[1].replace(/,/g, "")) : null,
    hasOfferForSale: /\bOffer for Sale\b/i.test(text) && /(?:Promoter )?Selling Shareholders?/i.test(text),
  };
}

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * First `n` numbered risk factors of the "Risk Factors" section, verbatim (first
 * sentences, ≤ 60 words). Companies conventionally list the most material risks first.
 */
export function extractTopRisks(pages: string[], n = 5): string[] {
  const start = pages.findIndex((p, i) => i < 120 && /SECTION\s+II\s*[:–—-]?\s*RISK FACTORS/i.test(p.slice(0, 400)));
  if (start < 0) return [];
  let end = pages.findIndex((p, i) => i > start && /SECTION\s+III/i.test(p.slice(0, 400)));
  if (end < 0 || end - start > 60) end = Math.min(pages.length, start + 60);
  const section = pages.slice(start, end).join("\n");
  const internal = section.search(/Internal Risk Factors|Risks? Relating to (?:Our|the Company'?s|Our Company'?s) (?:Business|Company)/i);
  const body = internal >= 0 ? section.slice(internal) : section;

  const items: string[] = [];
  const re = /(?:^|\n)\s*(\d{1,3})\.\s+(?=[A-Z])/g;
  const marks = [...body.matchAll(re)].map((m) => ({ n: Number(m[1]), at: m.index! + m[0].length }));
  let expect = 1;
  for (let i = 0; i < marks.length && items.length < n; i++) {
    if (marks[i].n !== expect) continue; // only the running 1,2,3… sequence: ignores stray list numbers
    const raw = clean(body.slice(marks[i].at, marks[i + 1]?.at ?? body.length)).replace(/\s\d{1,3}$/, "");
    const head = raw.split(/\s+/).slice(0, 30);
    const numeric = head.filter((w) => /\d/.test(w)).length;
    if (head.length < 8 || numeric / head.length > 0.3) continue; // table row ("5. Revenue from … 1,911.07 238.04"), not a risk heading — don't consume the number
    expect++;
    const sentences = raw.split(/(?<=[.!?])\s+(?=[A-Z₹"“(])/);
    let out = "";
    for (const s of sentences) {
      if (wordCount(`${out} ${s}`) > 60 && out) break;
      out = out ? `${out} ${s}` : s;
      if (wordCount(out) >= 25) break;
    }
    const words = out.split(/\s+/);
    items.push(words.length > 60 ? `${words.slice(0, 60).join(" ")}…` : out);
  }
  return items.filter((s) => wordCount(s) >= 6);
}
