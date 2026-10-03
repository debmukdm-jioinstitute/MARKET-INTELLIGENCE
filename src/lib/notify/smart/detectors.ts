/**
 * Smart notifications — event detectors.
 *
 * Each detector reads a REAL collector table and emits normalized events for
 * genuinely new, important occurrences. Detectors are pure-ish: they take a
 * query runner and return events. Missing tables degrade to [] (never throw).
 *
 * PENDING_SOURCE (no history table yet — detectors return [] until built):
 *   - price/volume shock: needs daily OHLCV history (bhavcopy pipeline)
 *   - FII/DII streaks, VIX regime: needs macro series wiring
 */
import type { EventCategory } from "../types";
import { breadthFor, clamp100, importance, rarityFirstTime } from "./score";

export interface DetectedEvent {
  key: string;
  category: EventCategory;
  severity: "high" | "medium" | "info";
  importance: number;
  symbol?: string | null;
  title: string;
  body: string;
  href: string;
  why: string;
  source_url?: string | null;
}

/** Minimal query surface so detectors stay unit-testable. */
export interface Db {
  query: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;
}

/** Nifty-50 constituents (reviewed periodically; used only for breadth scoring). */
const NIFTY50 = new Set(
  "RELIANCE TCS HDFCBANK ICICIBANK INFY ITC SBIN BHARTIARTL KOTAKBANK LT AXISBANK ASIANPAINT MARUTI TITAN SUNPHARMA ULTRACEMCO NTPC TATAMOTORS M&M POWERGRID TATASTEEL HINDALCO BAJFINANCE BAJAJFINSV ADANIENT ADANIPORTS COALINDIA DRREDDY CIPLA EICHERMOT GRASIM HINDUNILVR INDUSINDBK JSWSTEEL NESTLEIND ONGC SHRIRAMFIN TECHM TRENT TVSMOTOR UPL WIPRO APOLLOHOSP BEL BRITANNIA HEROMOTOCO SBILIFE DIVISLAB".split(" "),
);

const isNifty50 = (s?: string | null) => !!s && NIFTY50.has(s.toUpperCase().replace(/[^A-Z0-9]/g, ""));
const companyHref = (symbol?: string | null) => (symbol ? `/research/${encodeURIComponent(symbol)}` : "/research");
const day = (d: unknown) => { try { return new Date(d as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" }); } catch { return ""; } };
const inr = (n: unknown) => { const v = Number(n); return Number.isFinite(v) ? `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : ""; };

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try { return await fn(); } catch { return []; }
}

/** 1. New broker calls (last 30h). */
export async function detectBrokerCalls(db: Db): Promise<DetectedEvent[]> {
  return safe(async () => {
    const rows = await db.query`
      SELECT symbol, company, broker, action, target_price, report_date, tone, source_url
      FROM broker_calls WHERE created_at > now() - interval '30 hours' ORDER BY created_at DESC LIMIT 50`;
    return rows.map((r) => {
      const sym = String(r.symbol ?? "");
      const bullish = /buy|add|outperform/i.test(String(r.action ?? ""));
      const imp = importance(bullish ? 65 : 55, rarityFirstTime(), breadthFor({ isNifty50: isNifty50(sym) }));
      return {
        key: `broker:${sym}:${String(r.report_date ?? "").slice(0, 10)}:${String(r.broker ?? "").slice(0, 24)}`,
        category: "broker" as EventCategory,
        severity: (bullish ? "medium" : "info") as DetectedEvent["severity"],
        importance: imp, symbol: sym || null,
        title: `${r.broker}: ${r.action} ${r.company}`,
        body: `Target ${inr(r.target_price)} · report dated ${day(r.report_date)}${r.tone ? ` · tone ${r.tone}` : ""}`,
        href: companyHref(sym),
        why: `A new public broker call on ${r.company || sym} — ${String(r.action)} with target ${inr(r.target_price)}. Recent broker calls we collected, not full-market consensus.`,
        source_url: (r.source_url as string) || null,
      };
    });
  });
}

/** 2. Financial results filed (last 30h). */
export async function detectResults(db: Db): Promise<DetectedEvent[]> {
  return safe(async () => {
    const rows = await db.query`
      SELECT symbol, headline, broadcast_date, attachment_url
      FROM company_announcements
      WHERE created_at > now() - interval '30 hours'
        AND (category = 'results' OR headline ILIKE '%financial result%' OR headline ILIKE '%quarterly result%')
      ORDER BY broadcast_date DESC LIMIT 40`;
    return rows.map((r) => {
      const sym = String(r.symbol ?? "");
      const imp = importance(75, rarityFirstTime(), breadthFor({ isNifty50: isNifty50(sym) }));
      return {
        key: `results:${sym}:${String(r.broadcast_date ?? "").slice(0, 10)}`,
        category: "market" as EventCategory, severity: "high" as DetectedEvent["severity"],
        importance: imp, symbol: sym || null,
        title: `${sym || "Company"} filed results`,
        body: String(r.headline ?? "").slice(0, 140),
        href: companyHref(sym),
        why: `${sym} filed its financial results on ${day(r.broadcast_date)} — the numbers behind every valuation on its page just changed.`,
        source_url: (r.attachment_url as string) || null,
      };
    });
  });
}

/** 3. Corporate actions: dividend / bonus / split / buyback / rights (last 30h). */
export async function detectCorporateActions(db: Db): Promise<DetectedEvent[]> {
  return safe(async () => {
    const rows = await db.query`
      SELECT symbol, headline, broadcast_date, attachment_url
      FROM company_announcements
      WHERE created_at > now() - interval '30 hours'
        AND (headline ILIKE '%dividend%' OR headline ILIKE '%bonus issue%' OR headline ILIKE '%stock split%'
             OR headline ILIKE '%buyback%' OR headline ILIKE '%rights issue%')
      ORDER BY broadcast_date DESC LIMIT 40`;
    return rows.map((r) => {
      const sym = String(r.symbol ?? "");
      const imp = importance(65, rarityFirstTime(), breadthFor({ isNifty50: isNifty50(sym) }));
      return {
        key: `corpact:${sym}:${String(r.broadcast_date ?? "").slice(0, 10)}:${String(r.headline ?? "").slice(0, 30)}`,
        category: "market" as EventCategory, severity: "medium" as DetectedEvent["severity"],
        importance: imp, symbol: sym || null,
        title: `${sym}: ${String(r.headline ?? "").split("—")[0]!.slice(0, 80)}`,
        body: String(r.headline ?? "").slice(0, 140),
        href: companyHref(sym),
        why: `A shareholder-affecting corporate action was announced by ${sym} on ${day(r.broadcast_date)} — this changes share count, price basis, or cash you'll receive.`,
        source_url: (r.attachment_url as string) || null,
      };
    });
  });
}

/** 4–5. Pledge risk + promoter holding changes (latest two quarters per symbol). */
export async function detectOwnershipRisk(db: Db): Promise<DetectedEvent[]> {
  return safe(async () => {
    const rows = await db.query`
      WITH ranked AS (
        SELECT symbol, broadcast_date, quarter_end, promoter_pct, pledge_pct, xbrl_url,
               ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY broadcast_date DESC) AS rn
        FROM shareholding WHERE broadcast_date > now() - interval '120 days'
      ), piv AS (
        SELECT cur.symbol, cur.pledge_pct AS pledge_now, prev.pledge_pct AS pledge_prev,
               cur.promoter_pct AS prom_now, prev.promoter_pct AS prom_prev,
               cur.broadcast_date, cur.xbrl_url
        FROM ranked cur LEFT JOIN ranked prev ON cur.symbol = prev.symbol AND prev.rn = 2
        WHERE cur.rn = 1
      )
      SELECT * FROM piv
      WHERE (pledge_now > 20 AND (pledge_prev IS NULL OR pledge_prev <= 20))
         OR (pledge_now - COALESCE(pledge_prev, 0) > 5)
         OR (COALESCE(prom_prev, prom_now) - prom_now > 2)`;
    return rows.map((r) => {
      const sym = String(r.symbol ?? "");
      const pledgeNow = Number(r.pledge_now ?? 0), pledgePrev = Number(r.pledge_prev ?? 0);
      const promDrop = Number(r.prom_prev ?? r.prom_now ?? 0) - Number(r.prom_now ?? 0);
      const isPledge = pledgeNow > 20 || pledgeNow - pledgePrev > 5;
      const imp = importance(isPledge ? 90 : 70, rarityFirstTime(), breadthFor({ isNifty50: isNifty50(sym) }));
      const what = isPledge
        ? `Promoter pledging at ${pledgeNow.toFixed(1)}%${pledgePrev ? ` (was ${pledgePrev.toFixed(1)}%)` : ""}`
        : `Promoter holding fell ${promDrop.toFixed(1)}pp quarter-on-quarter`;
      return {
        key: `ownership:${sym}:${String(r.broadcast_date ?? "").slice(0, 10)}`,
        category: "promoter" as EventCategory, severity: "high" as DetectedEvent["severity"],
        importance: imp, symbol: sym || null,
        title: `${sym}: ${isPledge ? "pledge risk" : "promoter selling"}`,
        body: `${what} — filed ${day(r.broadcast_date)}`,
        href: companyHref(sym),
        why: isPledge
          ? `${what}. Pledged shares can be sold by lenders if loans sour — high pledge has preceded sharp falls before. Filed with NSE on ${day(r.broadcast_date)}.`
          : `${what}. When promoters steadily reduce their stake it deserves a look at why. Filed with NSE on ${day(r.broadcast_date)}.`,
        source_url: (r.xbrl_url as string) || null,
      };
    });
  });
}

/** 6. Credit rating actions (last 7d — weekly cadence source). */
export async function detectRatingActions(db: Db): Promise<DetectedEvent[]> {
  return safe(async () => {
    const rows = await db.query`
      SELECT symbol, agency, rating, notch, outlook, watch, action, action_date, rationale_url
      FROM credit_ratings WHERE action_date > now() - interval '8 days' ORDER BY action_date DESC LIMIT 40`;
    return rows.map((r) => {
      const sym = String(r.symbol ?? "");
      const act = String(r.action ?? "").toLowerCase();
      const isDown = act.includes("downgrade") || String(r.watch ?? "").toLowerCase().includes("negative") || String(r.outlook ?? "").toLowerCase() === "negative";
      const imp = importance(isDown ? 85 : 70, rarityFirstTime(), breadthFor({ isNifty50: isNifty50(sym) }));
      return {
        key: `rating:${sym}:${r.agency}:${String(r.action_date ?? "").slice(0, 10)}`,
        category: "credit" as EventCategory, severity: (isDown ? "high" : "medium") as DetectedEvent["severity"],
        importance: imp, symbol: sym || null,
        title: `${r.agency}: ${isDown ? "downgrade" : r.action} ${sym}`,
        body: `Now ${r.rating}${r.outlook ? `, outlook ${r.outlook}` : ""} — ${day(r.action_date)}`,
        href: companyHref(sym),
        why: `${r.agency} ${r.action} ${sym} to ${r.rating} on ${day(r.action_date)}. Rating moves change borrowing costs and fund mandates — downgrades have led price falls before. Rationale linked, never paraphrased.`,
        source_url: (r.rationale_url as string) || null,
      };
    });
  });
}

/** 7. Regulatory hits: SEBI orders / NCLT cases newly matched (last 30h). */
export async function detectRegulatory(db: Db): Promise<DetectedEvent[]> {
  return safe(async () => {
    const rows = await db.query`
      SELECT symbol, company_name, source, event_type, title, event_date, document_url
      FROM regulatory_events WHERE created_at > now() - interval '30 hours' ORDER BY event_date DESC LIMIT 30`;
    return rows.map((r) => {
      const sym = String(r.symbol ?? "");
      const imp = importance(90, rarityFirstTime(), breadthFor({ isNifty50: isNifty50(sym) }));
      return {
        key: `legal:${r.source}:${String(r.title ?? "").slice(0, 40)}:${String(r.event_date ?? "").slice(0, 10)}`,
        category: "market" as EventCategory, severity: "high" as DetectedEvent["severity"],
        importance: imp, symbol: sym || null,
        title: `${r.source} order: ${r.company_name || sym}`,
        body: String(r.title ?? "").slice(0, 140),
        href: companyHref(sym),
        why: `A ${r.source} ${r.event_type || "order"} mentioning ${r.company_name || sym} appeared on ${day(r.event_date)}. We quote the title only — read the linked document for the actual findings.`,
        source_url: (r.document_url as string) || null,
      };
    });
  });
}

/** 8. IPO milestones: stage changes + hot subscriptions. */
export async function detectIpoMilestones(db: Db): Promise<DetectedEvent[]> {
  return safe(async () => {
    const out: DetectedEvent[] = [];
    const stages = await db.query`
      SELECT company, stage, seen_at FROM ipo_stage_log WHERE seen_at > now() - interval '30 hours' ORDER BY seen_at DESC LIMIT 20`;
    for (const r of stages) {
      const co = String(r.company ?? "");
      out.push({
        key: `ipo:${co.slice(0, 40)}:${r.stage}:${String(r.seen_at ?? "").slice(0, 10)}`,
        category: "market" as EventCategory, severity: "medium" as DetectedEvent["severity"],
        importance: importance(65, rarityFirstTime(), 60), symbol: null,
        title: `IPO: ${co} → ${r.stage}`,
        body: `${co} moved to stage "${r.stage}"`,
        href: "/research/ipo",
        why: `${co}'s IPO moved to "${r.stage}" on ${day(r.seen_at)} — the pipeline funnel just shifted.`,
        source_url: null,
      });
    }
    const hot = await db.query`
      SELECT i.company, s.total_x, s.snapshot_at FROM ipo_subscription_snapshots s
      JOIN ipos i ON i.id = s.ipo_id
      WHERE s.snapshot_at > now() - interval '30 hours' AND s.total_x > 10
      ORDER BY s.total_x DESC LIMIT 10`;
    for (const r of hot) {
      const co = String(r.company ?? "");
      out.push({
        key: `iposub:${co.slice(0, 40)}:${String(r.snapshot_at ?? "").slice(0, 10)}`,
        category: "market" as EventCategory, severity: "medium" as DetectedEvent["severity"],
        importance: importance(70, rarityFirstTime(), 60), symbol: null,
        title: `${co} subscribed ${Number(r.total_x).toFixed(1)}×`,
        body: `Total subscription ${Number(r.total_x).toFixed(2)}× as of ${day(r.snapshot_at)}`,
        href: "/research/ipo",
        why: `${co} is ${Number(r.total_x).toFixed(1)}× subscribed — heavy demand, but subscription is not a listing-gain prediction.`,
        source_url: null,
      });
    }
    return out;
  });
}

/** 9. Retail buzz spikes (win-9 sentiment signal). */
export async function detectBuzz(db: Db): Promise<DetectedEvent[]> {
  return safe(async () => {
    const rows = await db.query`
      SELECT symbol, day, mentions, sentiment_mean, volume_z, topics
      FROM sentiment_daily WHERE day > now() - interval '3 days' AND buzzing = true
      ORDER BY volume_z DESC NULLS LAST LIMIT 20`;
    return rows.map((r) => {
      const sym = String(r.symbol ?? "");
      const sent = Number(r.sentiment_mean ?? 0);
      const mood = sent > 0.2 ? "bullish" : sent < -0.2 ? "bearish" : "mixed";
      const imp = importance(55, rarityFirstTime(), breadthFor({ isNifty50: isNifty50(sym) }));
      return {
        key: `buzz:${sym}:${String(r.day ?? "").slice(0, 10)}`,
        category: "ai" as EventCategory, severity: "info" as DetectedEvent["severity"],
        importance: imp, symbol: sym || null,
        title: `${sym} is buzzing (${mood})`,
        body: `${r.mentions} mentions, volume z=${Number(r.volume_z ?? 0).toFixed(1)}, mood ${mood}`,
        href: companyHref(sym),
        why: `Retail chatter on ${sym} spiked to ${r.mentions} mentions (${mood} lean) on ${day(r.day)}. Buzz is attention, not information — it often peaks near tops and bottoms.`,
        source_url: null,
      };
    });
  });
}

/** 10. Fresh concall summaries (win-5). */
export async function detectConcall(db: Db): Promise<DetectedEvent[]> {
  return safe(async () => {
    const rows = await db.query`
      SELECT symbol, quarter, transcript_date FROM concall_summaries
      WHERE created_at > now() - interval '30 hours' ORDER BY transcript_date DESC LIMIT 20`;
    return rows.map((r) => {
      const sym = String(r.symbol ?? "");
      const imp = importance(60, rarityFirstTime(), breadthFor({ isNifty50: isNifty50(sym) }));
      return {
        key: `concall:${sym}:${String(r.transcript_date ?? "").slice(0, 10)}`,
        category: "market" as EventCategory, severity: "info" as DetectedEvent["severity"],
        importance: imp, symbol: sym || null,
        title: `${sym}: concall summary ready${r.quarter ? ` (${r.quarter})` : ""}`,
        body: "Said-vs-guided summary with prepared-vs-Q&A tone meter",
        href: companyHref(sym),
        why: `We summarized ${sym}'s latest earnings call — what management guided vs what analysts pushed on, plus whether tone cooled in Q&A. AI summary; read the linked transcript for exact wording.`,
        source_url: null,
      };
    });
  });
}

/** 11. Promoter disclosure feed (SAST/PIT transaction rows). */
export async function detectPromoterFeed(db: Db): Promise<DetectedEvent[]> {
  return safe(async () => {
    const rows = await db.query`
      SELECT symbol, company_name, title, category, transaction_date, source_url
      FROM promoter_disclosure_feed WHERE transaction_date > now() - interval '4 days' ORDER BY transaction_date DESC LIMIT 25`;
    return rows.map((r) => {
      const sym = String(r.symbol ?? "");
      const imp = importance(70, rarityFirstTime(), breadthFor({ isNifty50: isNifty50(sym) }));
      return {
        key: `promfeed:${String(r.title ?? "").slice(0, 40)}:${String(r.transaction_date ?? "").slice(0, 10)}`,
        category: "promoter" as EventCategory, severity: "medium" as DetectedEvent["severity"],
        importance: imp, symbol: sym || null,
        title: `Promoter disclosure: ${r.company_name || sym}`,
        body: String(r.title ?? "").slice(0, 140),
        href: companyHref(sym),
        why: `A promoter/insider disclosure for ${r.company_name || sym} was filed on ${day(r.transaction_date)} — insiders trading their own stock is always worth a glance at the filing.`,
        source_url: (r.source_url as string) || null,
      };
    });
  });
}

export const ALL_DETECTORS = [
  detectBrokerCalls, detectResults, detectCorporateActions, detectOwnershipRisk,
  detectRatingActions, detectRegulatory, detectIpoMilestones, detectBuzz,
  detectConcall, detectPromoterFeed,
];

/** Run every detector; returns all events (dedupe happens at insert). */
export async function runAllDetectors(db: Db): Promise<DetectedEvent[]> {
  const out: DetectedEvent[] = [];
  for (const d of ALL_DETECTORS) {
    try { out.push(...(await d(db))); } catch { /* one bad detector never kills the run */ }
  }
  // Clamp importance into 0–100 (defensive).
  for (const e of out) e.importance = clamp100(e.importance);
  return out;
}
