import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ensureCompetitionSchema } from "@/lib/competition/schema";
import { POST as adminPost } from "@/app/api/admin/competition/route";
import { POST as registerPost } from "@/app/api/competition/register/route";
import { POST as orderPost } from "@/app/api/competition/order/route";
import { GET as portfolioGet } from "@/app/api/competition/portfolio/route";
import { GET as boardGet } from "@/app/api/competition/leaderboard/route";
import { invalidateBoard } from "@/lib/competition/store";

const state = vi.hoisted(() => ({
  db: null as any,
  ready: false,
  user: null as any,
  quoteMode: "fresh",
}));
vi.mock("@/lib/db", () => ({
  hasDatabase: () => true,
  sql: () => tag,
  toDateString: (v: unknown) =>
    v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10),
  ensureSchema: async () => {
    if (!state.ready) {
      await state.db.exec(
        "CREATE TABLE IF NOT EXISTS nse_instruments(trading_symbol text,instrument_key text)",
      );
      await ensureCompetitionSchema(tag as any);
      state.ready = true;
    }
  },
}));
vi.mock("@/lib/session", () => ({
  getSessionUser: async () => state.user,
  getAdminUser: async () => (state.user?.role === "admin" ? state.user : null),
}));
vi.mock("@/lib/feeds/quotes", () => ({
  getQuotes: async (symbols: string[]) => ({
    quotes: symbols.map((symbol) => ({
      stale: state.quoteMode === "stale",
      quote: {
        symbol,
        price: 100,
        asOf: new Date().toISOString(),
        provider: "upstox",
      },
    })),
  }),
}));
vi.mock("@/lib/trade-lab/data", () => ({
  resolveInstrument: (symbol: string) => ({
    id: symbol,
    yahoo: `${symbol}.NS`,
    kind: "stock",
  }),
  fetchBars: async () => ({
    bars: Array.from({ length: 40 }, (_, i) => ({
      t: (Date.now() - (39 - i) * 86400000) / 1000,
      o: 100,
      h: 105,
      l: 95,
      c: 100,
      v: 1_000_000,
    })),
    hasVolume: true,
    source: "isolated test fixture",
  }),
}));
function tag(strings: TemplateStringsArray, ...values: unknown[]) {
  const query = strings
    .reduce(
      (s, part, i) => s + part + (i < values.length ? `$${i + 1}` : ""),
      "",
    )
    .replaceAll("clock_timestamp()", "public.clock_timestamp()")
    .replace(/\bnow\(\)/g, "public.clock_timestamp()");
  const run = async (db: any) => (await db.query(query, values)).rows;
  return {
    run,
    then: (resolve: any, reject: any) => run(state.db).then(resolve, reject),
  };
}
tag.transaction = async (queries: any[]) =>
  state.db.transaction(async (tx: any) => {
    const results = [];
    for (const q of queries) results.push(await q.run(tx));
    return results;
  });
const post = (body: object) =>
  new Request("http://localhost/api/competition", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const student = {
  email: "student@approved.example",
  name: "Student",
  guest: false,
  role: "user",
};
const admin = { ...student, email: "admin@approved.example", role: "admin" };
const clock = (at: string) => vi.setSystemTime(new Date(at));

describe.skipIf(!process.env.COMPETITION_TEST_PGLITE_MODULE)(
  "isolated PostgreSQL API story (no live database or quotes)",
  () => {
    beforeAll(async () => {
      const { PGlite } = await import(
        process.env.COMPETITION_TEST_PGLITE_MODULE!
      );
      state.db = new PGlite();
      await state.db.exec(
        "SET TIME ZONE 'UTC'; SET search_path TO public,pg_catalog; CREATE FUNCTION public.clock_timestamp() RETURNS timestamptz LANGUAGE sql AS $$ SELECT '2026-10-04T04:00:00Z'::timestamptz $$",
      );
      process.env.COMPETITION_EMAIL_DOMAINS = "approved.example";
      process.env.COMPETITION_DEVICE_SALT = "isolated-test-salt";
      vi.useFakeTimers({ toFake: ["Date"] });
      clock("2026-10-04T04:00:00Z");
    });
    afterAll(async () => {
      vi.useRealTimers();
      await state.db?.close();
    });
    it("admin creates season → student registers → valid/rejected orders → standings → disqualification", async () => {
      state.user = null;
      expect(
        (
          await orderPost(
            post({
              symbol: "RELIANCE",
              side: "BUY",
              shares: 100,
              requestId: crypto.randomUUID(),
            }),
          )
        ).status,
      ).toBe(401);
      state.user = admin;
      let res = await adminPost(
        post({
          action: "create",
          tradingDays: [
            "2026-10-05",
            "2026-10-06",
            "2026-10-07",
            "2026-10-08",
            "2026-10-09",
          ],
          finalistCount: 3,
        }),
      );
      expect(res.status).toBe(200);
      expect(
        (await adminPost(post({ action: "advance", status: "registration" })))
          .status,
      ).toBe(200);
      expect(
        (
          await adminPost(
            post({
              action: "instrument",
              symbol: "RELIANCE",
              name: "Reliance",
              kind: "equity",
              blocked: false,
              circuitLocked: false,
            }),
          )
        ).status,
      ).toBe(200);
      state.user = student;
      res = await registerPost(
        post({
          displayName: "Test Student",
          fingerprint: "isolated-test-device",
          acceptTerms: true,
          emailOptIn: false,
        }),
      );
      expect(res.status).toBe(200);
      expect(
        (
          await registerPost(
            post({
              displayName: "Test Student",
              fingerprint: "isolated-test-device",
              acceptTerms: true,
            }),
          )
        ).status,
      ).toBe(409);
      state.user = admin;
      expect(
        (await adminPost(post({ action: "advance", status: "live" }))).status,
      ).toBe(200);
      clock("2026-10-05T04:00:00Z");
      await state.db.exec(
        "CREATE OR REPLACE FUNCTION public.clock_timestamp() RETURNS timestamptz LANGUAGE sql AS $$ SELECT '2026-10-05T04:00:00Z'::timestamptz $$",
      );
      expect(
        (
          await adminPost(
            post({
              action: "instrument",
              symbol: "RELIANCE",
              name: "Reliance",
              kind: "equity",
              blocked: false,
              circuitLocked: false,
            }),
          )
        ).status,
      ).toBe(200);
      state.user = student;
      const requestId = crypto.randomUUID();
      res = await orderPost(
        post({ symbol: "RELIANCE", side: "BUY", shares: 100, requestId }),
      );
      expect(res.status).toBe(200);
      expect(
        (
          await orderPost(
            post({ symbol: "RELIANCE", side: "BUY", shares: 100, requestId }),
          )
        ).status,
      ).toBe(200);
      let book = await (await portfolioGet()).json();
      expect(book.holdings.cash).toBe(989988);
      expect(book.holdings.positions.RELIANCE).toBe(100);
      expect(book.trades).toHaveLength(1);
      res = await orderPost(
        post({
          symbol: "RELIANCE",
          side: "BUY",
          shares: 2400,
          requestId: crypto.randomUUID(),
        }),
      );
      expect(res.status).toBe(422);
      expect((await res.json()).error).toMatch(/25%/);
      res = await orderPost(
        post({
          symbol: "RELIANCE",
          side: "BUY",
          shares: 10000,
          requestId: crypto.randomUUID(),
        }),
      );
      expect((await res.json()).error).toMatch(/cash/);
      expect(
        (
          await orderPost(
            post({
              symbol: "BLOCKED",
              side: "BUY",
              shares: 1,
              requestId: crypto.randomUUID(),
            }),
          )
        ).status,
      ).toBe(422);
      res = await orderPost(
        post({
          symbol: "RELIANCE",
          side: "SELL",
          shares: 101,
          requestId: crypto.randomUUID(),
        }),
      );
      expect((await res.json()).error).toMatch(/shares/);
      state.quoteMode = "stale";
      expect(
        (
          await orderPost(
            post({
              symbol: "RELIANCE",
              side: "BUY",
              shares: 1,
              requestId: crypto.randomUUID(),
            }),
          )
        ).status,
      ).toBe(409);
      state.quoteMode = "fresh";
      const concurrent = await Promise.all(
        [1, 2].map(() =>
          orderPost(
            post({
              symbol: "RELIANCE",
              side: "BUY",
              shares: 100,
              requestId: crypto.randomUUID(),
            }),
          ),
        ),
      );
      expect(concurrent.map((r) => r.status).sort()).toEqual([200, 409]);
      invalidateBoard();
      let board = await (await boardGet()).json();
      expect(board.rows[0].rank).toBe(1);
      expect(board.rows[0].eligible).toBe(false);
      expect(JSON.stringify(board)).not.toContain(student.email);
      state.user = { ...student, guest: true };
      expect((await portfolioGet()).status).toBe(401);
      state.user = admin;
      expect(
        (
          await adminPost(
            post({
              action: "disqualify",
              email: student.email,
              reason: "Verified test misconduct",
            }),
          )
        ).status,
      ).toBe(200);
      state.user = student;
      invalidateBoard();
      board = await (await boardGet()).json();
      expect(board.rows[0].rank).toBeNull();
      expect(board.rows[0].disqualified).toBe(true);
      expect(
        (
          await orderPost(
            post({
              symbol: "RELIANCE",
              side: "BUY",
              shares: 1,
              requestId: crypto.randomUUID(),
            }),
          )
        ).status,
      ).toBe(403);
      book = await (await portfolioGet()).json();
      expect(book.trades).toHaveLength(2);
      state.user = admin;
      for (const day of [
        "2026-10-05",
        "2026-10-06",
        "2026-10-07",
        "2026-10-08",
        "2026-10-09",
      ]) {
        clock(`${day}T10:20:00Z`);
        expect((await adminPost(post({ action: "snapshot" }))).status).toBe(
          200,
        );
      }
      expect(
        (
          await adminPost(
            post({
              action: "corporateAction",
              symbol: "RELIANCE",
              ratio: 2,
              dividend: 0,
              exDate: "2026-10-05",
            }),
          )
        ).status,
      ).toBe(422);
      expect(
        (await adminPost(post({ action: "advance", status: "ended" }))).status,
      ).toBe(200);
      expect((await adminPost(post({ action: "verifyResults" }))).status).toBe(
        200,
      );
      expect(
        (
          await adminPost(
            post({
              action: "disqualify",
              email: student.email,
              reason: "Late modification",
            }),
          )
        ).status,
      ).toBe(422);
    }, 30_000);
  },
);
