import { sql, ensureSchema, toDateString } from "@/lib/db";
import { getQuotes } from "@/lib/feeds/quotes";
import { fetchBars, resolveInstrument } from "@/lib/trade-lab/data";
import {
  blocklist,
  friction,
  istDay,
  marketClose,
  marketOpen,
  minTurnover,
} from "./config";
import {
  activityEligible,
  getHoldings,
  portfolioValue,
  rankBoard,
  riskMetrics,
  validateOrder,
} from "./engine";
import type {
  BoardRow,
  Competition,
  CorporateAction,
  OrderResult,
  Participant,
  Snapshot,
  Trade,
} from "./types";

export const timestamp = (value: unknown) =>
  new Date(value as string | Date).toISOString();
type CompetitionRow = {
  id: string;
  slug: string;
  name: string;
  starts_at: Date;
  ends_at: Date;
  starting_capital: string;
  status: Competition["status"];
  trading_days: string[];
  revision: number;
  finalist_count: number;
  results_verified: boolean;
};
export async function currentCompetition(): Promise<Competition | null> {
  await ensureSchema();
  const [c] =
    (await sql()`SELECT * FROM competition LIMIT 1`) as CompetitionRow[];
  return c
    ? {
        id: c.id,
        slug: c.slug,
        name: c.name,
        startsAt: timestamp(c.starts_at),
        endsAt: timestamp(c.ends_at),
        startingCapital: Number(c.starting_capital),
        status: c.status,
        tradingDays: c.trading_days,
        revision: c.revision,
        finalistCount: c.finalist_count,
        resultsVerified: c.results_verified,
      }
    : null;
}
export async function participant(
  cid: string,
  email: string,
): Promise<Participant | null> {
  const [p] =
    (await sql()`SELECT user_email,display_name,status,ledger_version FROM competition_participants WHERE competition_id=${cid}::uuid AND user_email=${email}`) as {
      user_email: string;
      display_name: string;
      status: Participant["status"];
      ledger_version: number;
    }[];
  return p
    ? {
        email: p.user_email,
        displayName: p.display_name,
        status: p.status,
        version: p.ledger_version,
      }
    : null;
}
export async function loadLedger(cid: string, email?: string) {
  const db = sql();
  const [rawTrades, rawActions, rawSnapshots] = await Promise.all([
    db`SELECT * FROM competition_trades WHERE competition_id=${cid}::uuid AND (${email ?? null}::text IS NULL OR user_email=${email ?? null}) ORDER BY traded_at,id`,
    db`SELECT * FROM competition_splits WHERE competition_id=${cid}::uuid ORDER BY ex_date,id`,
    db`SELECT user_email,day,value,prices FROM competition_snapshots WHERE competition_id=${cid}::uuid AND (${email ?? null}::text IS NULL OR user_email=${email ?? null}) ORDER BY day`,
  ]);
  const trades = rawTrades.map((r) => ({
    email: String(r.user_email),
    id: String(r.id),
    symbol: String(r.symbol),
    side: r.side as Trade["side"],
    shares: Number(r.shares),
    price: Number(r.price),
    grossValue: Number(r.gross_value),
    brokerage: Number(r.brokerage),
    tradedAt: timestamp(r.traded_at),
  }));
  const actions: CorporateAction[] = rawActions.map((r) => ({
    id: String(r.id),
    symbol: String(r.symbol),
    ratio: Number(r.ratio),
    dividend: Number(r.dividend),
    exDate: toDateString(r.ex_date),
  }));
  const snapshots = rawSnapshots.map((r) => ({
    email: String(r.user_email),
    day: toDateString(r.day),
    value: Number(r.value),
    prices: r.prices as Record<string, number>,
  }));
  return { trades, actions, snapshots };
}
export async function marks(symbols: string[]) {
  const unique = [...new Set(symbols)];
  const { quotes } = await getQuotes(unique.map((s) => `${s}.NS`));
  const prices: Record<string, number> = {};
  const fresh: Record<string, boolean> = {};
  for (const { quote: q, stale } of quotes) {
    const symbol = q.symbol.replace(/\.NS$/, "");
    if (!unique.includes(symbol) || !Number.isFinite(q.price) || q.price <= 0)
      continue;
    prices[symbol] = q.price;
    const age = Date.now() - Date.parse(q.asOf);
    fresh[symbol] =
      !stale &&
      !q.stale &&
      Number.isFinite(age) &&
      age >= -60_000 &&
      age < 120_000;
  }
  return { prices, fresh, delayed: unique.some((s) => !fresh[s]) };
}

const liquidityCache = new Map<string, { at: number; value: number | null }>();
async function medianTurnover(symbol: string): Promise<number | null> {
  const hit = liquidityCache.get(symbol);
  if (hit && Date.now() - hit.at < 300_000) return hit.value;
  const inst = resolveInstrument(symbol)!;
  const data = await fetchBars(inst, "1d");
  const bars =
    data?.bars
      .filter((b) => istDay(b.t * 1000) < istDay(Date.now()))
      .slice(-20) ?? [];
  const recent =
    bars.length === 20 && Date.now() - bars[19].t * 1000 < 7 * 86_400_000;
  const values = bars.map((b) => b.c * b.v).sort((a, b) => a - b);
  const value =
    recent && values.every(Number.isFinite)
      ? (values[9] + values[10]) / 2
      : null;
  liquidityCache.set(symbol, { at: Date.now(), value });
  return value;
}

export async function placeOrder(
  c: Competition,
  email: string,
  input: {
    symbol: string;
    side: "BUY" | "SELL";
    shares: number;
    requestId: string;
  },
): Promise<OrderResult> {
  const error = (message: string, status = 422): OrderResult => ({
    ok: false,
    error: message,
    status,
  });
  const db = sql();
  const [existing] =
    await db`SELECT id FROM competition_trades WHERE competition_id=${c.id}::uuid AND user_email=${email} AND request_id=${input.requestId}::uuid`;
  if (existing) return { ok: true, tradeId: String(existing.id) };
  const now = Date.now(),
    today = istDay(now);
  if (
    c.status !== "live" ||
    now < Date.parse(c.startsAt) ||
    now >= Date.parse(c.endsAt) ||
    !c.tradingDays.includes(today) ||
    now < Date.parse(marketOpen(today)) ||
    now >= Date.parse(marketClose(today))
  )
    return error("Competition or market session is closed.", 409);
  const p = await participant(c.id, email);
  if (!p || p.status !== "active")
    return error("Register as an active participant first.", 403);
  const symbol = input.symbol.trim().toUpperCase().replace(/\.NS$/, "");
  const [instrument] =
    await db`SELECT * FROM competition_instruments WHERE symbol=${symbol}`;
  if (
    !instrument ||
    instrument.blocked ||
    instrument.circuit_locked ||
    blocklist().includes(symbol) ||
    Date.now() - Date.parse(timestamp(instrument.reviewed_at)) > 86_400_000
  )
    return error(
      "Instrument is not approved, is blocked, or needs a circuit-status review.",
    );
  const ledger = await loadLedger(c.id, email);
  const holdings = getHoldings(
    ledger.trades,
    ledger.actions,
    c.startingCapital,
    now,
  );
  const { prices, fresh } = await marks([
    ...Object.keys(holdings.positions),
    symbol,
  ]);
  if (
    !fresh[symbol] ||
    (input.side === "BUY" &&
      Object.keys(holdings.positions).some((s) => !fresh[s]))
  )
    return error("Fresh quotes are required to trade — data delayed.", 409);
  const floor = Number(process.env.COMPETITION_MIN_PRICE ?? 20);
  if (!Number.isFinite(floor) || floor <= 0 || prices[symbol] < floor)
    return error("Penny-stock price threshold failed.");
  const turnover = await medianTurnover(symbol);
  if (turnover === null || turnover < minTurnover())
    return error("Insufficient verified median daily turnover.");
  const problem = validateOrder(
    holdings,
    prices,
    symbol,
    input.side,
    input.shares,
  );
  if (problem) return error(problem);
  const price = prices[symbol],
    gross = Math.round(price * input.shares * 100) / 100;
  const [{ result }] =
    await db`SELECT competition_commit_order(${c.id}::uuid,${email},${p.version},${c.revision},${symbol},${input.side},${input.shares},${price},${gross},${friction(gross)},${input.requestId}::uuid) AS result`;
  return result as OrderResult;
}

export async function myPortfolio(c: Competition, email: string) {
  const p = await participant(c.id, email);
  const ledger = await loadLedger(c.id, email);
  const asOf = Math.min(Date.now(), Date.parse(c.endsAt));
  const holdings = getHoldings(
    ledger.trades,
    ledger.actions,
    c.startingCapital,
    asOf,
  );
  const final = ledger.snapshots.find((s) => s.day === c.tradingDays[4]);
  const quote =
    c.status === "ended"
      ? { prices: final?.prices ?? {}, delayed: !final }
      : await marks(Object.keys(holdings.positions));
  const value =
    c.status === "ended"
      ? (final?.value ?? null)
      : portfolioValue(holdings, quote.prices);
  return {
    participant: p,
    holdings,
    prices: quote.prices,
    value,
    returnPct: value === null ? null : (value / c.startingCapital - 1) * 100,
    delayed: quote.delayed || value === null,
    trades: ledger.trades,
    snapshots: ledger.snapshots,
  };
}

// Cache only public rows: no email, device fingerprint or trade detail can leak to preview/MCP.
const boardCache = new Map<
  string,
  { at: number; rows: BoardRow[]; delayed: boolean }
>();
export function invalidateBoard() {
  boardCache.clear();
}
export async function leaderboard(c: Competition, uncached = false) {
  const key = `${c.id}:${c.revision}:${c.status}`;
  const cached = boardCache.get(key);
  if (!uncached && cached && Date.now() - cached.at < 300_000) return cached;
  const db = sql();
  const people =
    await db`SELECT user_email,display_name,status FROM competition_participants WHERE competition_id=${c.id}::uuid ORDER BY created_at`;
  const ledger = await loadLedger(c.id);
  const books = people.map((p) => ({
    p,
    holdings: getHoldings(
      ledger.trades.filter((t) => t.email === p.user_email),
      ledger.actions,
      c.startingCapital,
      Math.min(Date.now(), Date.parse(c.endsAt)),
    ),
  }));
  const quote =
    c.status === "ended"
      ? { prices: {}, delayed: false }
      : await marks(books.flatMap((b) => Object.keys(b.holdings.positions)));
  const rows = rankBoard(
    books.map(({ p, holdings }) => {
      const snapshots: Snapshot[] = ledger.snapshots.filter(
        (s) => s.email === p.user_email,
      );
      const value =
        c.status === "ended"
          ? (snapshots.find((s) => s.day === c.tradingDays[4])?.value ?? null)
          : portfolioValue(holdings, quote.prices);
      const complete =
        snapshots.length === 5 &&
        c.tradingDays.every((day) => snapshots.some((s) => s.day === day));
      const metrics = riskMetrics(snapshots, c.startingCapital);
      return {
        displayName: String(p.display_name),
        value,
        returnPct:
          value === null ? null : (value / c.startingCapital - 1) * 100,
        symbolsTraded: holdings.symbolsTraded.length,
        eligible:
          activityEligible(holdings) &&
          p.status === "active" &&
          (c.status !== "ended" || complete),
        disqualified: p.status === "disqualified",
        ...metrics,
        lastTradeAt: holdings.lastTradeAt,
        snapshots: snapshots.length,
      };
    }),
  );
  const result = {
    rows,
    at: Date.now(),
    delayed: quote.delayed || rows.some((r) => r.value === null),
  };
  boardCache.set(key, result);
  return result;
}

/** Record same-day closes only, with all marks complete. No backfill at today's prices. */
export async function takeSnapshot(
  c: Competition,
): Promise<{ ok: boolean; error?: string; day?: string; count?: number }> {
  const day = istDay(Date.now());
  if (
    c.status !== "live" ||
    !c.tradingDays.includes(day) ||
    Date.now() < Date.parse(marketClose(day))
  )
    return {
      ok: false,
      error: "Snapshot requires a live season after today's market close.",
    };
  const db = sql();
  const people =
    await db`SELECT user_email FROM competition_participants WHERE competition_id=${c.id}::uuid`;
  const ledger = await loadLedger(c.id);
  const books = people.map((p) => ({
    email: String(p.user_email),
    holdings: getHoldings(
      ledger.trades.filter((t) => t.email === p.user_email),
      ledger.actions,
      c.startingCapital,
      Date.parse(marketClose(day)),
    ),
  }));
  const symbols = [
    ...new Set(books.flatMap((b) => Object.keys(b.holdings.positions))),
  ];
  const prices: Record<string, number> = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      const data = await fetchBars(resolveInstrument(symbol)!, "1d", "3mo", {
        signal: AbortSignal.timeout(45_000),
        attempts: 1,
        timeoutMs: 4500,
      });
      const bar = data?.bars.find((b) => istDay(b.t * 1000) === day);
      if (bar && Number.isFinite(bar.c) && bar.c > 0) prices[symbol] = bar.c;
    }),
  );
  if (symbols.some((s) => !prices[s]))
    return {
      ok: false,
      error:
        "Closing data delayed; no snapshots recorded. Retry today when every closing price is available.",
    };
  // Transaction guards revision to avoid recording books while corporate actions change.
  const queries = books.map(
    (
      b,
    ) => db`INSERT INTO competition_snapshots(competition_id,user_email,day,value,prices)
    SELECT ${c.id}::uuid,${b.email},${day}::date,${portfolioValue(b.holdings, prices)},${JSON.stringify(prices)}::jsonb
    FROM competition WHERE id=${c.id}::uuid AND revision=${c.revision} AND status='live'
    ON CONFLICT DO NOTHING RETURNING user_email`,
  );
  await db.transaction([
    db`SELECT id FROM competition WHERE id=${c.id}::uuid FOR SHARE`,
    ...queries,
  ]);
  invalidateBoard();
  return { ok: true, day, count: books.length };
}
