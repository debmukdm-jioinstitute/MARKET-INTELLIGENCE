/**
 * DRHP / RHP cover reading (pure functions over page text).
 * Fills what exists on the first pages of a draft prospectus: book running lead
 * managers and the offer size. Price band and dates are legitimately unknown at
 * DRHP stage (shown as [●]) and are never estimated here.
 */

/** Known SEBI-registered merchant bankers → short display name. Matched on normalised tokens. */
const BANKERS: [string, string][] = [
  ["kotak mahindra capital", "Kotak Mahindra Capital"],
  ["icici securities", "ICICI Securities"],
  ["axis capital", "Axis Capital"],
  ["jm financial", "JM Financial"],
  ["nuvama wealth", "Nuvama"],
  ["edelweiss financial services", "Edelweiss Financial Services"],
  ["iifl capital services", "IIFL Capital"],
  ["iifl securities", "IIFL Securities"],
  ["sbi capital markets", "SBI Capital Markets"],
  ["motilal oswal investment advisors", "Motilal Oswal"],
  ["motilal oswal", "Motilal Oswal"],
  ["hdfc bank", "HDFC Bank"],
  ["idfc first bank", "IDFC First Bank"],
  ["bob capital markets", "BOB Capital Markets"],
  ["bofa securities india", "BofA Securities"],
  ["citigroup global markets india", "Citi"],
  ["goldman sachs india securities", "Goldman Sachs"],
  ["morgan stanley india", "Morgan Stanley"],
  ["jpmorgan india", "J.P. Morgan"],
  ["j p morgan india", "J.P. Morgan"],
  ["jefferies india", "Jefferies"],
  ["ubs securities india", "UBS"],
  ["nomura financial advisory", "Nomura"],
  ["hsbc securities and capital markets", "HSBC"],
  ["dam capital advisors", "DAM Capital"],
  ["ambit capital", "Ambit"],
  ["anand rathi advisors", "Anand Rathi"],
  ["equirus capital", "Equirus"],
  ["elara capital", "Elara"],
  ["systematix corporate services", "Systematix"],
  ["pantomath capital advisors", "Pantomath"],
  ["hem securities", "Hem Securities"],
  ["unistone capital", "Unistone"],
  ["beeline capital advisors", "Beeline"],
  ["choice capital advisors", "Choice Capital"],
  ["arihant capital markets", "Arihant Capital"],
  ["fedex securities", "Fedex Securities"],
  ["sundae capital advisors", "Sundae Capital"],
  ["smart horizon capital advisors", "Smart Horizon"],
  ["narnolia financial advisors", "Narnolia"],
  ["khambatta securities", "Khambatta"],
  ["monarch networth capital", "Monarch Networth"],
  ["ikigai capital", "Ikigai"],
  ["inga capital", "Inga Capital"],
  ["ashika capital", "Ashika Capital"],
  ["gretex corporate services", "Gretex"],
  ["horizon management", "Horizon Management"],
  ["first overseas capital", "First Overseas Capital"],
  ["cumulative capital", "Cumulative Capital"],
  ["saffron capital advisors", "Saffron Capital"],
  ["shreni shares", "Shreni Shares"],
  ["sarthi capital advisors", "Sarthi Capital"],
  ["afs  capital", "AFS Capital"],
];

type TrieNode = { next: Map<string, TrieNode>; value?: string };

function buildTrie(entries: [string, string][]): TrieNode {
  const root: TrieNode = { next: new Map() };
  for (const [phrase, display] of entries) {
    let node = root;
    for (const tok of phrase.split(/\s+/).filter(Boolean)) {
      let child = node.next.get(tok);
      if (!child) node.next.set(tok, (child = { next: new Map() }));
      node = child;
    }
    node.value = display;
  }
  return root;
}
const TRIE = buildTrie(BANKERS);

const tokens = (s: string) => s.toLowerCase().replace(/[.,()'’"“”]/g, " ").replace(/&/g, " and ").split(/\s+/).filter(Boolean);

/** Single left-to-right pass; at every token the longest dictionary phrase wins. O(tokens × longest phrase). */
export function scanBankers(text: string): string[] {
  const toks = tokens(text);
  const found: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    let node = TRIE;
    let best: { len: number; value: string } | null = null;
    for (let j = i; j < toks.length; j++) {
      const nx = node.next.get(toks[j]);
      if (!nx) break;
      node = nx;
      if (node.value) best = { len: j - i + 1, value: node.value };
    }
    if (best) {
      if (!found.includes(best.value)) found.push(best.value);
      i += best.len - 1;
    }
  }
  return found;
}

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

/** Every cover section that follows a lead-manager heading (stops at registrar / schedule / counsel). */
function brlmSections(pages: string[]): string[] {
  const out: string[] = [];
  for (const p of pages) {
    const t = collapse(p);
    for (const m of t.matchAll(/BOOK RUNNING LEAD MANAGERS?(?: TO THE (?:OFFER|ISSUE))?/gi)) {
      const from = t.slice(m.index + m[0].length);
      const end = from.search(/REGISTRAR TO THE|BID\s*\/\s*(?:OFFER|ISSUE)\s+(?:PROGRAMME|SCHEDULE)|SYNDICATE MEMBER|LEGAL COUNSEL|ANCHOR INVESTOR/i);
      const section = end > 0 ? from.slice(0, end) : from.slice(0, 1500);
      if (section.length > 30) out.push(section);
    }
  }
  return out;
}

const HEADER_WORDS = new Set(["logo", "name", "of", "the", "brlm", "brlms", "brlm(s)", "contact", "person", "persons", "person(s)", "telephone", "tel", "email", "e-mail", "and", "no", "details", "to", "offer", "issue"]);
/** Drop table-header words that precede a name ("Telephone Email Socradamus Capital" → "Socradamus Capital"). */
function stripHeader(name: string): string {
  const w = name.split(" ");
  while (w.length > 2 && HEADER_WORDS.has(w[0].toLowerCase().replace(/[:.]/g, ""))) w.shift();
  return w.join(" ");
}

const NAME_RE = /((?:[A-Z][A-Za-z.&'’-]*\s+){1,7}(?:Private\s+)?(?:Limited|Ltd\.?))/g;

/** Lead managers: dictionary trie first (canonical names), generic "… Limited" pattern for unknown bankers. */
export function extractBrlms(pages: string[]): string[] {
  const sections = brlmSections(pages.slice(0, 8));
  for (const section of sections) {
    const known = scanBankers(section);
    if (known.length) return known.slice(0, 10);
  }
  for (const section of sections) {
    const body = section.replace(/^.*?E-?\s?MAIL\s+AND\s+TELEPHONE\s*/i, "").replace(/^.*?CONTACT PERSON\s*/i, "");
    const out: string[] = [];
    for (const m of body.matchAll(NAME_RE)) {
      const name = stripHeader(collapse(m[1]).replace(/\s+(?:Private\s+)?(?:Limited|Ltd\.?)$/i, ""));
      if (name.split(" ").length >= 2 && !out.includes(name)) out.push(name);
    }
    if (out.length) return out.slice(0, 10);
  }
  return [];
}

const toCr = (amount: number, unit: string): number => {
  const u = unit.toLowerCase();
  if (u.startsWith("mill")) return amount / 10;
  if (u.startsWith("lakh")) return amount / 100;
  if (u.startsWith("bill")) return amount * 100;
  return amount; // crore
};
const r2 = (n: number) => Math.round(n * 100) / 100;

export type OfferCover = {
  freshIssueCr: number | null;
  freshShares: number | null;
  totalShares: number | null;
  ofsShares: number | null;
  ofsCr: number | null;
  totalOfferCr: number | null;
  structure: "fresh" | "ofs" | "fresh+ofs" | null;
};

type Cell = { applicable: boolean; shares: number | null; cr: number | null };

const BLANK = String.raw`\[[●•]\]`;
// One table cell: "Not applicable" or "[Up to|Fresh Issue of up to|Offer for sale of up to] N Equity Shares … aggregating (up) to ₹ X unit".
const CELL_RE = new RegExp(
  String.raw`Not\s+applicable|(?:(?:Fresh Issue|Offer for Sale)\s+of\s+)?(?:up\s*to\s+)?([\d,]+|${BLANK})\s+(?:equity\s+)?shares(?:(?!Not\s+applicable)[\s\S]){0,110}?(?:aggregating|amounting)\s*(?:up\s*)?to\s*₹\s*([\d,]+(?:\.\d+)?|${BLANK})\s*(million|lakhs?|crores?|billion)?`,
  "gi",
);
const LABEL_RE = /(Fresh Issue and Offer for Sale|Fresh Issue and OFS|Offer for Sale|Fresh Issue)\s+(?=Up\s*to|Upto|Not\s+applicable|Fresh Issue of|Offer for Sale of)/i;

const toNum = (v: string | undefined) => (v && /\d/.test(v) ? Number(v.replace(/,/g, "")) : null);

/**
 * Offer size from the "Details of the Offer" table on the cover: one row labelled
 * Fresh Issue / Offer for Sale / both, then three cells (fresh, OFS, total) in that order.
 * Anything still "[●]" stays null: nothing is estimated.
 */
export function extractOfferCover(pages: string[]): OfferCover {
  const t = collapse(pages.slice(0, 6).join(" "));
  const label = LABEL_RE.exec(t);
  const empty: OfferCover = { freshIssueCr: null, freshShares: null, totalShares: null, ofsShares: null, ofsCr: null, totalOfferCr: null, structure: null };
  if (!label) return empty;
  const segment = t.slice(label.index + label[0].length, label.index + label[0].length + 1200);
  const cells: Cell[] = [];
  for (const m of segment.matchAll(CELL_RE)) {
    if (cells.length >= 3) break;
    if (/^not/i.test(m[0])) cells.push({ applicable: false, shares: null, cr: null });
    else cells.push({ applicable: true, shares: toNum(m[1]), cr: m[2] && /\d/.test(m[2]) ? r2(toCr(toNum(m[2])!, m[3] ?? "crore")) : null });
  }
  const both = /and (?:Offer for Sale|OFS)/i.test(label[1]);
  const isOfs = !both && /^Offer/i.test(label[1]);
  const [fresh, ofs, total] = both ? [cells[0], cells[1], cells[2]] : isOfs ? [undefined, cells[1] ?? cells[0], cells[2] ?? cells[1]] : [cells[0], undefined, cells[2] ?? cells[1]];
  const freshIssueCr = fresh?.cr ?? null;
  const ofsCr = ofs?.cr ?? null;
  return {
    freshIssueCr,
    freshShares: fresh?.shares ?? null,
    totalShares: total?.shares ?? null,
    ofsShares: ofs?.shares ?? null,
    ofsCr,
    totalOfferCr: total?.cr ?? (freshIssueCr !== null && ofsCr !== null ? r2(freshIssueCr + ofsCr) : isOfs ? ofsCr : both ? null : freshIssueCr),
    structure: both ? "fresh+ofs" : isOfs ? "ofs" : "fresh",
  };
}

export type DrhpCover = { brlms: string[]; offer: OfferCover };
export function extractCover(pages: string[]): DrhpCover {
  return { brlms: extractBrlms(pages), offer: extractOfferCover(pages) };
}
