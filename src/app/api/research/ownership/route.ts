import { ensureSchema, hasDatabase, sql, toDateString } from "@/lib/db";
import { computeOwnershipFlags, type OwnershipRow } from "@/lib/research/ownership";
import { nseJson } from "@/lib/feeds/india/nse-session";
import { masterToRows, parseShpXbrl } from "@/lib/collector/shareholding";
import { NextResponse } from "next/server";

export const revalidate = 900;

const CACHE = "public, s-maxage=21600, stale-while-revalidate=1800"; // 6 hours — filings are quarterly
const NSE_SHP = "https://www.nseindia.com/companies-listing/corporate-filings-shareholding-pattern";

type Row = {
  broadcast_date: Date | string;
  quarter_end: Date | string | null;
  promoter_pct: string | null;
  fii_pct: string | null;
  dii_pct: string | null;
  public_pct: string | null;
  pledge_pct: string | null;
  shareholder_count: string | number | null;
  xbrl_url: string | null;
};
const num = (v: string | null) => (v === null ? null : Number(v));

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "application/xml,text/xml,*/*",
  Referer: "https://www.nseindia.com/",
};

async function fetchLiveOwnership(symbol: string): Promise<OwnershipRow[]> {
  try {
    type MasterRow = {
      broadcastDate?: string | null;
      date?: string | null;
      pr_and_prgrp?: string | null;
      public_val?: string | null;
      xbrl?: string | null;
    };
    const master = await nseJson<MasterRow[]>(
      `/api/corporate-share-holdings-master?index=equities&symbol=${encodeURIComponent(symbol)}`,
    );
    if (!Array.isArray(master) || !master.length) return [];
    const filings = masterToRows(symbol, master);
    if (!filings.length) return [];

    // Parse the latest XBRL for FII, DII, and pledge details
    const latest = filings[0];
    if (latest?.xbrlUrl) {
      try {
        const res = await fetch(latest.xbrlUrl, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(15_000) });
        if (res.ok) {
          const detail = parseShpXbrl(await res.text());
          latest.quarterEnd = detail.quarterEnd ?? latest.quarterEnd;
          latest.promoterPct = latest.promoterPct ?? detail.promoterPct;
          latest.publicPct = detail.publicPct ?? latest.publicPct;
          latest.fiiPct = detail.fiiPct;
          latest.diiPct = detail.diiPct;
          latest.pledgePct = detail.pledgePct;
          latest.shareholderCount = detail.shareholderCount;
        }
      } catch {
        // keep master data
      }
    }

    return filings
      .slice(0, 9)
      .map((f) => ({
        broadcastDate: f.broadcastDate,
        quarterEnd: f.quarterEnd,
        promoterPct: f.promoterPct,
        fiiPct: f.fiiPct,
        diiPct: f.diiPct,
        publicPct: f.publicPct,
        pledgePct: f.pledgePct,
        shareholderCount: f.shareholderCount,
        xbrlUrl: f.xbrlUrl,
      }))
      .reverse();
  } catch {
    return [];
  }
}

/**
 * GET /api/research/ownership?symbol=RELIANCE
 * Latest shareholding breakdown, last-8-quarters series and deterministic
 * risk flags (pledge > 20%, pledge +5pp QoQ, promoter holding −2pp QoQ).
 * Dates are NSE filing dates; every flag links its filing.
 */
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z0-9&.\-]{1,20}$/.test(symbol)) return NextResponse.json({ error: "Missing or invalid symbol" }, { status: 400 });
  const nseUrl = `${NSE_SHP}?symbol=${encodeURIComponent(symbol)}`;
  const empty = { symbol, latest: null, series: [], flags: [], nseUrl };

  let asc: OwnershipRow[] = [];

  if (hasDatabase()) {
    try {
      await ensureSchema();
      const rows = (await sql()`
        SELECT broadcast_date, quarter_end, promoter_pct, fii_pct, dii_pct, public_pct, pledge_pct, shareholder_count, xbrl_url
        FROM shareholding WHERE symbol = ${symbol} ORDER BY broadcast_date DESC LIMIT 9
      `) as Row[];

      if (rows.length > 0) {
        asc = rows
          .map((r) => ({
            broadcastDate: toDateString(r.broadcast_date),
            quarterEnd: r.quarter_end ? toDateString(r.quarter_end) : null,
            promoterPct: num(r.promoter_pct),
            fiiPct: num(r.fii_pct),
            diiPct: num(r.dii_pct),
            publicPct: num(r.public_pct),
            pledgePct: num(r.pledge_pct),
            shareholderCount: r.shareholder_count === null ? null : Number(r.shareholder_count),
            xbrlUrl: r.xbrl_url,
          }))
          .reverse();
      }
    } catch {
      // fallback to live
    }
  }

  // If no DB rows found, fetch live from NSE official API
  if (asc.length === 0) {
    asc = await fetchLiveOwnership(symbol);
  }

  if (asc.length === 0) {
    return NextResponse.json({ ...empty, dbConfigured: hasDatabase() }, { headers: { "Cache-Control": CACHE } });
  }

  const last8 = asc.slice(-8);
  const cutoff = last8[0]?.broadcastDate ?? "";
  return NextResponse.json(
    {
      symbol,
      dbConfigured: hasDatabase(),
      latest: asc[asc.length - 1] ?? null,
      series: last8.map((r) => ({
        broadcastDate: r.broadcastDate,
        quarterEnd: r.quarterEnd,
        promoterPct: r.promoterPct,
        pledgePct: r.pledgePct,
      })),
      flags: computeOwnershipFlags(asc).filter((f) => f.broadcastDate >= cutoff),
      nseUrl,
    },
    { headers: { "Cache-Control": CACHE } },
  );
}
