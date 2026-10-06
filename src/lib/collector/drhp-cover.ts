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
      const name = collapse(m[1]).replace(/\s+(?:Private\s+)?(?:Limited|Ltd\.?)$/i, "").replace(/^(?:Name of|The)\s+/i, "");
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
const AMOUNT = String.raw`₹\s*([\d,]+(?:\.\d+)?)\s*(million|lakhs?|crores?|billion)`;

export type OfferCover = {
  freshIssueCr: number | null;
  ofsShares: number | null;
  ofsCr: number | null;
  totalOfferCr: number | null;
  structure: "fresh" | "ofs" | "fresh+ofs" | null;
};

/** Offer size from the first pages. Everything still "[●]" stays null. */
export function extractOfferCover(pages: string[]): OfferCover {
  const t = collapse(pages.slice(0, 6).join(" "));
  const num = (s: string) => Number(s.replace(/,/g, ""));
  const fresh = new RegExp(String.raw`Fresh Issue(?: of)?(?:(?!Offer for Sale)[\s\S]){0,160}?(?:aggregating|amounting)(?: up)?\s*to\s*${AMOUNT}`, "i").exec(t);
  const ofsAmt = new RegExp(String.raw`Offer for Sale(?: of)?(?:(?!Fresh Issue)[\s\S]){0,160}?(?:aggregating|amounting)(?: up)?\s*to\s*${AMOUNT}`, "i").exec(t);
  const ofsShares = /Offer for Sale of up to\s*([\d,]+)\s*(?:equity )?shares/i.exec(t);
  const total = new RegExp(String.raw`(?:aggregating|amounting)(?: up)?\s*to\s*${AMOUNT}\s*(?:\(|comprising|\.)`, "i").exec(t);
  const freshIssueCr = fresh ? r2(toCr(num(fresh[1]), fresh[2])) : null;
  const ofsCr = ofsAmt ? r2(toCr(num(ofsAmt[1]), ofsAmt[2])) : null;
  const hasFresh = /Fresh Issue of/i.test(t);
  const hasOfs = /Offer for Sale of/i.test(t);
  return {
    freshIssueCr,
    ofsShares: ofsShares ? num(ofsShares[1]) : null,
    ofsCr,
    totalOfferCr: total ? r2(toCr(num(total[1]), total[2])) : freshIssueCr !== null && ofsCr !== null ? r2(freshIssueCr + ofsCr) : freshIssueCr !== null && !hasOfs ? freshIssueCr : ofsCr !== null && !hasFresh ? ofsCr : null,
    structure: hasFresh && hasOfs ? "fresh+ofs" : hasFresh ? "fresh" : hasOfs ? "ofs" : null,
  };
}

export type DrhpCover = { brlms: string[]; offer: OfferCover };
export function extractCover(pages: string[]): DrhpCover {
  return { brlms: extractBrlms(pages), offer: extractOfferCover(pages) };
}
