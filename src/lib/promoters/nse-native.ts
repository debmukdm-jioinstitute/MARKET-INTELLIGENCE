import { createHash } from "node:crypto";
import { nseJson } from "@/lib/feeds/india/nse-session";
import type { PromoterFeedItem } from "@/lib/promoters/feed-types";

/**
 * Official NSE JSON endpoints (same ones nseindia.com's own pages call) — real
 * exchange filings instead of news-search proxies. Each source is best-effort and
 * independent: one failing never blocks the others.
 */

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/** "08-Oct-2026" | "08-OCT-2026 to 09-OCT-2026" | "08-Oct-2026 16:31:07" -> "2026-10-08" */
export function nseDateToIso(raw: string | null | undefined): string | null {
  const m = raw?.match(/(\d{2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return null;
  const mm = MONTHS[m[2]!.toUpperCase()];
  return mm ? `${m[3]}-${mm}-${m[1]}` : null;
}

function ddmmyyyy(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}-${p(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
}

function id(...parts: Array<string | null | undefined>): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24);
}

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};
const cr = (rupees: number) => `₹${(rupees / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 1 })} cr`;
const qtyFmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

type SastRow = {
  acquirerName?: string; company?: string; symbol?: string; acqSaleType?: string;
  noOfShareAcq?: string | null; noOfShareSale?: string | null; totAftShare?: string | null;
  promoterType?: string; acquisitionMode?: string; regType?: string; timestamp?: string;
  attachement?: string; acquirerDate?: string; application_no?: string;
};

async function fetchSast(): Promise<PromoterFeedItem[]> {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  const j = await nseJson<{ data?: SastRow[] }>(
    `/api/corporate-sast-reg29?index=equities&from_date=${ddmmyyyy(from)}&to_date=${ddmmyyyy(to)}`,
    { timeoutMs: 25_000, attempts: 2 },
  );
  return (j.data ?? []).flatMap((r): PromoterFeedItem[] => {
    const date = nseDateToIso(r.timestamp) ?? nseDateToIso(r.acquirerDate);
    if (!date || !r.symbol) return [];
    const sale = /sale|disposal|pledge invok/i.test(r.acqSaleType ?? "") || (num(r.noOfShareSale) > 0 && !num(r.noOfShareAcq));
    const isPromoter = r.promoterType === "Y";
    const shares = sale ? num(r.noOfShareSale) : num(r.noOfShareAcq);
    const who = r.acquirerName ?? "Acquirer";
    const after = r.totAftShare ? `, holding now ${r.totAftShare}%` : "";
    return [{
      id: id("sast", r.application_no, r.symbol, r.acquirerName, date),
      channel: "NSE disclosures",
      title: `${r.company ?? r.symbol}: ${who} ${sale ? "sold" : "acquired"} ${qtyFmt(shares)} shares (${r.acquisitionMode ?? r.regType ?? "SAST"})${after}`,
      companyName: r.company ?? null,
      symbol: r.symbol,
      category: isPromoter ? (sale ? "PROMOTER_SELLING" : "PROMOTER_BUYING") : "LARGE_SHAREHOLDER_CHANGE",
      transactionDate: date,
      sourceUrl: r.attachement || "https://www.nseindia.com/companies-listing/corporate-filings-regulation-29",
      snippet: `${r.regType ?? "Reg 29"} · ${isPromoter ? "Promoter / PAC" : "Non-promoter"} · ${r.acqSaleType ?? ""}`.trim(),
      collector: "nse-api",
    }];
  });
}

type DealRow = { buySell?: string | null; clientName?: string | null; date?: string; name?: string; qty?: string; symbol?: string; watp?: string | null };

const MIN_BULK_VALUE_INR = 5e7; // ₹5 cr — bulk window is 200+ rows/day, mostly noise below this

async function fetchDeals(): Promise<PromoterFeedItem[]> {
  const j = await nseJson<{ BULK_DEALS_DATA?: DealRow[]; BLOCK_DEALS_DATA?: DealRow[] }>(
    "/api/snapshot-capital-market-largedeal",
    { timeoutMs: 25_000, attempts: 2 },
  );
  const mk = (rows: DealRow[], kind: "BLOCK_DEAL" | "BULK_DEAL") =>
    rows.flatMap((r): PromoterFeedItem[] => {
      const date = nseDateToIso(r.date);
      const qty = num(r.qty);
      const value = qty * num(r.watp);
      if (!date || !r.symbol || !r.buySell || !qty) return [];
      if (kind === "BULK_DEAL" && value < MIN_BULK_VALUE_INR) return [];
      const side = r.buySell.toUpperCase() === "BUY" ? "bought" : "sold";
      return [{
        id: id(kind, r.symbol, r.clientName, r.buySell, date, r.qty),
        channel: "Bulk & block deals",
        title: `${r.name ?? r.symbol}: ${r.clientName ?? "Client"} ${side} ${qtyFmt(qty)} shares @ ₹${r.watp ?? "—"} (${cr(value)} ${kind === "BLOCK_DEAL" ? "block" : "bulk"} deal)`,
        companyName: r.name ?? null,
        symbol: r.symbol,
        category: kind,
        transactionDate: date,
        sourceUrl: "https://www.nseindia.com/market-data/block-deal-watch",
        snippet: null,
        collector: "nse-api",
      }];
    });
  return [...mk(j.BLOCK_DEALS_DATA ?? [], "BLOCK_DEAL"), ...mk(j.BULK_DEALS_DATA ?? [], "BULK_DEAL")];
}

type PledgeRow = {
  comName?: string; broadcastDt?: string; shp?: string; percPromoterHolding?: string;
  percSharesPledged?: string; numSharesPledged?: string;
};

const MIN_PLEDGE_PCT = 10; // only surface meaningful promoter pledges
const MAX_PLEDGE_ITEMS = 40;

async function fetchPledges(): Promise<PromoterFeedItem[]> {
  // ~1 MB / 1.5k rows — parsed once per run in the cron runner, never on a user request.
  const j = await nseJson<{ data?: PledgeRow[] }>("/api/corporate-pledgedata?index=equities", {
    timeoutMs: 30_000,
    attempts: 2,
  });
  return (j.data ?? [])
    .filter((r) => num(r.percSharesPledged) >= MIN_PLEDGE_PCT && r.comName)
    .sort((a, b) => num(b.percSharesPledged) - num(a.percSharesPledged))
    .slice(0, MAX_PLEDGE_ITEMS)
    .flatMap((r): PromoterFeedItem[] => {
      const date = nseDateToIso(r.broadcastDt);
      if (!date) return [];
      return [{
        id: id("pledge", r.comName, r.shp, r.percSharesPledged),
        channel: "Promoter & pledge",
        title: `${r.comName}: ${num(r.percSharesPledged).toFixed(2)}% of shares pledged (promoter holding ${num(r.percPromoterHolding).toFixed(1)}%, as of ${r.shp ?? "latest SHP"})`,
        companyName: r.comName ?? null,
        symbol: null,
        category: "PLEDGE_INCREASE",
        transactionDate: date,
        sourceUrl: "https://www.nseindia.com/companies-listing/corporate-filings-pledged-data",
        snippet: `${qtyFmt(num(r.numSharesPledged))} shares pledged`,
        collector: "nse-api",
      }];
    });
}

export type NativeResult = { items: PromoterFeedItem[]; failed: string[] };

/** Run all NSE sources concurrently; partial failure is tolerated and reported. */
export async function fetchNseNative(): Promise<NativeResult> {
  const sources = { sast: fetchSast, deals: fetchDeals, pledge: fetchPledges } as const;
  const names = Object.keys(sources) as (keyof typeof sources)[];
  const settled = await Promise.allSettled(names.map((n) => sources[n]()));
  const items: PromoterFeedItem[] = [];
  const failed: string[] = [];
  settled.forEach((s, i) => (s.status === "fulfilled" ? items.push(...s.value) : failed.push(names[i]!)));
  return { items, failed };
}
