import { getDocumentProxy } from "unpdf";
import { nseJson } from "@/lib/feeds/india/nse-session";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { validateSource } from "@/lib/research/transcript-archive";

/**
 * Leadership, pay-disparity, shareholding and dividend snapshot built only from free, public filings:
 * Wikidata (founders / CEO / chair), NSE BRSR (median pay by category), NSE shareholding XBRL (share counts)
 * and NSE corporate actions (dividends). Nothing is estimated silently: derived numbers are labelled as such.
 */

export type Person = { role: "Founder" | "CEO" | "Chair"; name: string; profileUrl: string | null; imageUrl: string | null };
export type PayRow = { category: "Board of Directors" | "Key Managerial Personnel" | "Employees (non-board, non-KMP)" | "Workers"; maleCount: number | null; maleMedian: number | null; femaleCount: number | null; femaleMedian: number | null };
export type Dividend = { exDate: string; perShare: number; subject: string };
export type Holding = { label: string; shares: number; pctOfTotal: number | null; dividendIncomeTtm: number | null };
export type Leadership = {
  symbol: string;
  company: string | null;
  checkedAt: string;
  people: Person[];
  pay: { fy: string; sourceUrl: string; rows: PayRow[]; ratios: { label: string; times: number }[] } | null;
  dividends: { history: Dividend[]; ttmPerShare: number | null; byYear: { fy: string; perShare: number }[] } | null;
  holdings: { asOf: string | null; totalShares: number; sourceUrl: string; rows: Holding[] } | null;
  annualReportUrl: string | null;
  notes: string[];
};

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const MAX_BYTES = 30 * 1024 * 1024;
const cache = new Map<string, { value: Leadership; until: number }>();
const pending = new Map<string, Promise<Leadership>>();

const num = (s: string, mult = 1) => (/^(nil|na)$/i.test(s) ? null : Math.round(Number(s.replace(/,/g, "")) * mult));
const NUM = String.raw`([\d,]+(?:\.\d+)?|Nil|NA)`;

/** BRSR Principle 5 Q3(a): "Board of Directors (BoD)* 5 20,00,00,000 Nil NA Key Managerial Personnel# 1 ..." */
export function parseBrsrPay(text: string): PayRow[] {
  const t = text.replace(/\s+/g, " ");
  const start = t.search(/Median remuneration/i);
  if (start < 0) return [];
  const seg = t.slice(start, start + 1800);
  // Companies report in rupees, lakhs, crores or millions; normalise to rupees.
  const unitText = t.slice(Math.max(0, start - 300), start + 500);
  const mult = /lakh/i.test(unitText) ? 1e5 : /crore|\bcr\b/i.test(unitText) ? 1e7 : /million/i.test(unitText) ? 1e6 : 1;
  const labels: [PayRow["category"], RegExp][] = [
    ["Board of Directors", /Board of Directors(?: \(BoD\))?[*#^\s]*/i],
    ["Key Managerial Personnel", /Key Managerial Personnel(?: \(KMP\))?[*#^\s]*/i],
    ["Employees (non-board, non-KMP)", /Employees other than BoD and KMP[*#^\s]*/i],
    ["Workers", /Workers[*#^\s]*/i],
  ];
  const rows: PayRow[] = [];
  for (const [category, re] of labels) {
    const m = new RegExp(`${re.source}\\s+${NUM}\\s+${NUM}\\s+${NUM}\\s+${NUM}`, "i").exec(seg);
    if (!m) continue;
    rows.push({ category, maleCount: num(m[1]), maleMedian: num(m[2], mult), femaleCount: num(m[3]), femaleMedian: num(m[4], mult) });
  }
  return rows;
}

export function parseDividends(actions: { subject?: string; exDate?: string }[]): Dividend[] {
  const out: Dividend[] = [];
  for (const a of actions) {
    const subject = a.subject ?? "";
    if (!/dividend/i.test(subject) || /\bnil\b/i.test(subject)) continue;
    const m = /(?:rs\.?|re\.?|inr)\s*([\d]+(?:\.\d+)?)/i.exec(subject);
    const d = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(a.exDate ?? "");
    if (!m || !d) continue;
    const mon = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(d[2].toLowerCase());
    if (mon < 0) continue;
    out.push({ exDate: `${d[3]}-${String(mon + 1).padStart(2, "0")}-${d[1]}`, perShare: Number(m[1]), subject });
  }
  return out.sort((a, b) => b.exDate.localeCompare(a.exDate));
}

const fyOf = (iso: string) => { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); const s = m >= 4 ? y : y - 1; return `FY${String(s + 1).slice(2)}`; };

async function wikidata(isin: string): Promise<{ company: string | null; people: Person[] }> {
  const query = `SELECT ?coLabel ?prop ?vLabel ?art ?img WHERE { ?co wdt:P946 "${isin}" . VALUES ?prop { wdt:P112 wdt:P169 wdt:P488 } OPTIONAL { ?co ?prop ?v . OPTIONAL { ?art schema:about ?v ; schema:isPartOf <https://en.wikipedia.org/> } OPTIONAL { ?v wdt:P18 ?img } } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`;
  const res = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, { headers: { "User-Agent": "MarketIntelligence/1.0 (https://getmarketintelligence.in)", Accept: "application/sparql-results+json" }, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
  const rows = ((await res.json()) as { results: { bindings: Record<string, { value: string }>[] } }).results.bindings;
  const roles: Record<string, Person["role"]> = { P112: "Founder", P169: "CEO", P488: "Chair" };
  const seen = new Set<string>();
  const people: Person[] = [];
  for (const r of rows) {
    const role = roles[r.prop?.value.split("/").pop() ?? ""];
    const name = r.vLabel?.value;
    if (!role || !name || /^Q\d+$/.test(name) || seen.has(`${role}:${name}`)) continue;
    seen.add(`${role}:${name}`);
    const img = r.img?.value;
    people.push({ role, name, profileUrl: r.art?.value ?? `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(name)}`, imageUrl: img ? img.replace(/^http:/, "https:") + "?width=96" : null });
  }
  return { company: rows[0]?.coLabel?.value ?? null, people };
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  await validateSource(url);
  const res = await fetch(url, { headers: { "User-Agent": UA, Referer: "https://www.nseindia.com/" }, signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (Number(res.headers.get("content-length")) > MAX_BYTES) throw new Error("Source too large");
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("Source too large");
  return buf;
}

async function fetchRetry(url: string): Promise<Uint8Array> {
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    try { return await fetchBytes(url); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
  }
  throw last;
}

/** Scan pages in order and stop at the median-pay table (it sits in the first ~60 pages of long reports). */
async function payFromPdf(bytes: Uint8Array) {
  const proxy = await getDocumentProxy(bytes, { stopAtErrors: false } as never);
  try {
    const limit = Math.min(proxy.numPages, 140);
    for (let i = 1; i <= limit; i++) {
      const content = await (await proxy.getPage(i)).getTextContent();
      const page = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
      if (!/median remuneration/i.test(page)) continue;
      const rows = parseBrsrPay(page);
      if (rows.length >= 2) return rows;
    }
    return null;
  } finally { await (proxy as unknown as { destroy?: () => Promise<void> }).destroy?.(); }
}

async function brsrPay(symbol: string) {
  const r = await nseJson<{ data?: { attachmentFile?: string; fyFrom?: number; fyTo?: number }[] }>(`/api/corporate-bussiness-sustainabilitiy?index=equities&symbol=${encodeURIComponent(symbol)}`);
  const files = (r.data ?? []).filter((d) => d.attachmentFile && /\.pdf$/i.test(d.attachmentFile)).sort((a, b) => (b.fyTo ?? 0) - (a.fyTo ?? 0)).slice(0, 2);
  let lastErr: unknown = new Error("No BRSR filing listed");
  // Newest filing first; fall back to the prior year only if the newest file is dead or unreadable (labelled with its FY).
  for (const f of files) {
    try {
      const rows = await payFromPdf(await fetchRetry(f.attachmentFile!));
      if (!rows) { lastErr = new Error("Pay table not found in BRSR"); continue; }
      const emp = rows.find((x) => x.category.startsWith("Employees"));
      const empMedian = emp?.maleMedian ?? emp?.femaleMedian ?? null;
      const ratios: { label: string; times: number }[] = [];
      if (empMedian) {
        for (const x of rows) {
          if (x === emp || x.category === "Workers") continue;
          const top = Math.max(x.maleMedian ?? 0, x.femaleMedian ?? 0);
          if (top > 0) ratios.push({ label: `${x.category} vs employee median`, times: Math.round((top / empMedian) * 10) / 10 });
        }
      }
      return { fy: `FY${String(f.fyTo ?? "").slice(2) || "?"}`, sourceUrl: f.attachmentFile!, rows, ratios };
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function holdingsAndIsin(symbol: string, ttm: number | null) {
  const master = await nseJson<{ xbrl?: string; date?: string }[]>(`/api/corporate-share-holdings-master?index=equities&symbol=${encodeURIComponent(symbol)}`);
  const url = (Array.isArray(master) ? master : []).find((m) => m.xbrl)?.xbrl;
  if (!url) return null;
  const xml = new TextDecoder().decode(await fetchBytes(url));
  const shares = (ctx: string) => { const m = new RegExp(`<in-bse-shp:NumberOfShares contextRef="${ctx}"[^>]*>(\\d+)<`).exec(xml); return m ? Number(m[1]) : null; };
  const total = shares("ShareholdingPattern_ContextI");
  if (!total) return null;
  const wanted: [string, string][] = [
    ["Promoter & promoter group", "ShareholdingOfPromoterAndPromoterGroup_ContextI"],
    ["  of which individuals / HUFs", "IndividualsOrHinduUndividedFamily_ContextI"],
    ["Directors & their relatives (non-promoter)", "DirectorsAndDirectorsRelatives_ContextI"],
    ["Key managerial personnel (non-promoter)", "KeyManagerialPersonnel_ContextI"],
  ];
  const rows: Holding[] = [];
  for (const [label, ctx] of wanted) {
    const n = shares(ctx);
    if (n === null) continue;
    rows.push({ label: label.trim(), shares: n, pctOfTotal: Math.round((n / total) * 10_000) / 100, dividendIncomeTtm: ttm !== null ? Math.round(n * ttm) : null });
  }
  return { asOf: master.find((m) => m.xbrl)?.date ?? null, totalShares: total, sourceUrl: url, rows };
}

async function build(symbol: string): Promise<Leadership> {
  const notes: string[] = [];
  const out: Leadership = { symbol, company: null, checkedAt: new Date().toISOString(), people: [], pay: null, dividends: null, holdings: null, annualReportUrl: null, notes };
  const actionsP = nseJson<{ subject?: string; exDate?: string; isin?: string; comp?: string }[]>(`/api/corporates-corporateActions?index=equities&symbol=${encodeURIComponent(symbol)}`).catch(() => null);
  const arP = nseJson<{ data?: { fileName?: string }[] }>(`/api/annual-reports?index=equities&symbol=${encodeURIComponent(symbol)}`).then((r) => r.data?.[0]?.fileName ?? null).catch(() => null);
  let payErr = "";
  const payP = brsrPay(symbol).catch((e) => { payErr = e instanceof Error ? e.message : String(e); return null; });
  const actions = await actionsP;
  const isin = actions?.find((a) => a.isin)?.isin;
  out.company = actions?.find((a) => a.comp)?.comp ?? null;
  const people = isin ? wikidata(isin).catch(() => null) : Promise.resolve(null);

  let ttm: number | null = null;
  if (actions) {
    const history = parseDividends(actions);
    const cutoff = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
    ttm = history.filter((d) => d.exDate >= cutoff).reduce((s, d) => s + d.perShare, 0) || null;
    const byYear = new Map<string, number>();
    for (const d of history) byYear.set(fyOf(d.exDate), (byYear.get(fyOf(d.exDate)) ?? 0) + d.perShare);
    out.dividends = { history: history.slice(0, 12), ttmPerShare: ttm, byYear: [...byYear].slice(0, 8).map(([fy, perShare]) => ({ fy, perShare })).reverse() };
  } else notes.push("Dividend history could not be fetched from NSE just now.");

  const [holdings, pay, ppl, ar] = await Promise.all([holdingsAndIsin(symbol, ttm).catch(() => null), payP, people, arP]);
  out.holdings = holdings;
  out.pay = pay;
  out.annualReportUrl = ar;
  if (ppl) { out.people = ppl.people; out.company = ppl.company ?? out.company; }
  if (!out.people.length) notes.push("Founder/CEO details are not in the open knowledge base (Wikidata) for this company.");
  if (!pay) notes.push(`Median-pay table not read${payErr ? ` (${payErr.slice(0, 120)})` : ""}. BRSR is mandatory for the top 1,000 listed companies only.`);
  if (!holdings) notes.push("Share-count breakdown from the latest shareholding filing was unavailable.");
  notes.push("Named executive pay and individual share holdings sit in the annual report; open it below. Medians are as reported by the company, not averages.");
  return out;
}

export async function getCompanyLeadership(raw: string): Promise<Leadership> {
  const symbol = raw.trim().toUpperCase();
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) throw new Error("Invalid symbol");
  const key = `leadership:v2:${symbol}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  const running = pending.get(key);
  if (running) return running;
  const job = (async () => {
    if (hasDatabase()) {
      const disk = await (async () => { await ensureSchema(); const rows = await sql()`SELECT payload FROM transcript_archive_cache WHERE cache_key = ${key} AND expires_at > now()`; return rows[0]?.payload as Leadership | undefined; })().catch(() => undefined);
      if (disk) { cache.set(key, { value: disk, until: Date.now() + 3600_000 }); return disk; }
    }
    const value = await build(symbol);
    const rich = Boolean(value.pay || value.holdings || value.dividends || value.people.length);
    // Incomplete results (no pay table) retry hourly; complete ones live a week.
    const ttl = value.pay ? 7 * 86_400_000 : rich ? 3600_000 : 60_000;
    cache.set(key, { value, until: Date.now() + Math.min(ttl, 3600_000) });
    if (hasDatabase() && rich) await sql()`INSERT INTO transcript_archive_cache (cache_key, payload, expires_at) VALUES (${key}, ${JSON.stringify(value)}::jsonb, ${new Date(Date.now() + ttl).toISOString()}::timestamptz) ON CONFLICT (cache_key) DO UPDATE SET payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at`.catch(() => {});
    return value;
  })();
  pending.set(key, job);
  try { return await job; } finally { pending.delete(key); }
}
