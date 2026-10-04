import { z } from "zod";
import { sql } from "@/lib/db";
import { findIndiaInstrument } from "@/lib/feeds/india/instruments";
import {
  currentCompetition,
  invalidateBoard,
  loadLedger,
  leaderboard,
  takeSnapshot,
} from "./store";
import { marketClose, marketOpen, STARTING_CAPITAL } from "./config";
import { getHoldings } from "./engine";

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Invalid date",
  );
const email = z
  .string()
  .email()
  .transform((s) => s.toLowerCase());
export const adminCommand = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    tradingDays: z.array(day).length(5),
    finalistCount: z.number().int().min(1).max(100),
  }),
  z.object({ action: z.literal("reopenRegistration") }),
  z.object({
    action: z.literal("advance"),
    status: z.enum(["registration", "live", "ended"]),
  }),
  z.object({
    action: z.literal("disqualify"),
    email,
    reason: z.string().trim().min(5).max(500),
  }),
  z.object({ action: z.literal("snapshot") }),
  z.object({
    action: z.literal("instrument"),
    symbol: z.string().regex(/^[A-Z0-9&\-]{1,20}$/),
    name: z.string().min(1).max(120),
    kind: z.enum(["equity", "etf"]),
    blocked: z.boolean(),
    circuitLocked: z.boolean(),
  }),
  z.object({
    action: z.literal("corporateAction"),
    symbol: z.string().regex(/^[A-Z0-9&\-]{1,20}$/),
    ratio: z.number().positive().max(100),
    dividend: z.number().nonnegative().max(100000),
    exDate: day,
  }),
  z.object({ action: z.literal("resolveFlag"), id: z.string().uuid() }),
  z.object({ action: z.literal("verifyResults") }),
  z.object({
    action: z.literal("event"),
    event: z.enum(["announce", "reminder", "standings"]),
  }),
]);
export async function runAdmin(input: z.infer<typeof adminCommand>) {
  const db = sql();
  const c = await currentCompetition();
  const fail = (error: string) => ({ ok: false, error });
  if (input.action === "create") {
    if (c) return fail("Only one standalone season is supported.");
    const days = input.tradingDays;
    if (
      new Set(days).size !== 5 ||
      days.some(
        (d, i) =>
          (i > 0 && d <= days[i - 1]) ||
          [0, 6].includes(new Date(d).getUTCDay()),
      ) ||
      Date.parse(days[4]) - Date.parse(days[0]) > 6 * 86400000
    )
      return fail(
        "Supply five ordered weekdays in one trading week. Verify NSE holidays before creating.",
      );
    if (Date.parse(marketOpen(days[0])) <= Date.now())
      return fail("Season must start in the future.");
    await db`INSERT INTO competition(slug,name,starts_at,ends_at,starting_capital,trading_days,finalist_count)
      VALUES('alpha-league-s1','The Alpha League',${marketOpen(days[0])}::timestamptz,${marketClose(days[4])}::timestamptz,${STARTING_CAPITAL},${JSON.stringify(days)}::jsonb,${input.finalistCount})`;
    return { ok: true };
  }
  if (!c) return fail("Create the season first.");
  if (input.action === "snapshot") return takeSnapshot(c);
  if (input.action === "reopenRegistration") {
    // Recovery path for a season advanced to live too early: only before the
    // first market open, and only while no trade or snapshot exists.
    if (c.status !== "live")
      return fail("Only a live season that has not started can reopen registration.");
    if (Date.now() >= Date.parse(c.startsAt))
      return fail("Registration cannot reopen after the season starts.");
    const changed = await db`UPDATE competition SET status='registration',revision=revision+1
      WHERE id=${c.id}::uuid AND status='live' AND revision=${c.revision}
      AND NOT EXISTS (SELECT 1 FROM competition_trades t WHERE t.competition_id=competition.id)
      AND NOT EXISTS (SELECT 1 FROM competition_snapshots s WHERE s.competition_id=competition.id)
      RETURNING id`;
    invalidateBoard();
    return changed.length
      ? { ok: true }
      : fail("Cannot reopen: trades or snapshots exist, or status changed; reload.");
  }
  if (input.action === "advance") {
    const expected = {
      registration: "draft",
      live: "registration",
      ended: "live",
    }[input.status];
    if (c.status !== expected)
      return fail("Statuses must advance draft → registration → live → ended.");
    if (input.status === "registration" && Date.now() >= Date.parse(c.startsAt))
      return fail("Registration cannot open after the season starts.");
    if (input.status === "live" && Date.now() >= Date.parse(c.endsAt))
      return fail("Season has already elapsed.");
    if (input.status === "ended") {
      if (Date.now() < Date.parse(c.endsAt))
        return fail("Wait until the final market close.");
      const [{ missing }] =
        await db`SELECT count(*)::int AS missing FROM competition_participants p
        WHERE p.competition_id=${c.id}::uuid AND (SELECT count(*) FROM competition_snapshots s WHERE s.competition_id=p.competition_id AND s.user_email=p.user_email)<>5`;
      if (Number(missing) > 0)
        return fail(
          "Every participant needs all five daily snapshots before ending.",
        );
    }
    const changed =
      await db`UPDATE competition SET status=${input.status},revision=revision+1
      WHERE id=${c.id}::uuid AND status=${expected} AND revision=${c.revision}
      AND (${input.status} <> 'ended' OR NOT EXISTS (
        SELECT 1 FROM competition_participants p WHERE p.competition_id=competition.id AND
        (SELECT count(*) FROM competition_snapshots s WHERE s.competition_id=p.competition_id AND s.user_email=p.user_email)<>5
      )) RETURNING id`;
    invalidateBoard();
    return changed.length ? { ok: true } : fail("Status changed; reload.");
  }
  if (input.action === "instrument") {
    const curated = findIndiaInstrument(input.symbol);
    const [master] =
      await db`SELECT instrument_key FROM nse_instruments WHERE trading_symbol=${input.symbol} AND instrument_key LIKE 'NSE_EQ|%' LIMIT 1`;
    if (!curated && !master)
      return fail(
        "Symbol must exist in the repository's NSE equity instrument master. Sync the master first.",
      );
    await db.transaction([
      db`SELECT id FROM competition WHERE id=${c.id}::uuid FOR UPDATE`,
      db`INSERT INTO competition_instruments(symbol,name,kind,blocked,circuit_locked,reviewed_at)
        VALUES(${input.symbol},${input.name},${input.kind},${input.blocked},${input.circuitLocked},now())
        ON CONFLICT(symbol) DO UPDATE SET name=EXCLUDED.name,kind=EXCLUDED.kind,blocked=EXCLUDED.blocked,circuit_locked=EXCLUDED.circuit_locked,reviewed_at=now()`,
      db`UPDATE competition SET revision=revision+1 WHERE id=${c.id}::uuid`,
    ]);
    invalidateBoard();
    return { ok: true };
  }
  if (input.action === "corporateAction") {
    if (c.status === "ended" || !c.tradingDays.includes(input.exDate))
      return fail(
        "Action must be within this season and results must not be frozen.",
      );
    const [{ n }] =
      await db`SELECT count(*)::int n FROM competition_snapshots WHERE competition_id=${c.id}::uuid AND day>=${input.exDate}::date`;
    if (Number(n) > 0)
      return fail(
        "Cannot change an action after affected snapshots have been recorded.",
      );
    const changed = await db.transaction([
      db`SELECT id FROM competition WHERE id=${c.id}::uuid FOR UPDATE`,
      db`INSERT INTO competition_splits(competition_id,symbol,ratio,dividend,ex_date)
        SELECT id,${input.symbol},${input.ratio},${input.dividend},${input.exDate}::date FROM competition
        WHERE id=${c.id}::uuid AND revision=${c.revision} AND status<>'ended'
        AND NOT EXISTS (SELECT 1 FROM competition_snapshots WHERE competition_id=${c.id}::uuid AND day>=${input.exDate}::date)
        ON CONFLICT(competition_id,symbol,ex_date) DO UPDATE SET ratio=EXCLUDED.ratio,dividend=EXCLUDED.dividend RETURNING id`,
      db`UPDATE competition SET revision=revision+1 WHERE id=${c.id}::uuid`,
    ]);
    invalidateBoard();
    return changed[1].length
      ? { ok: true }
      : fail("Season changed or affected snapshots exist; reload.");
  }
  if (input.action === "disqualify") {
    if (c.resultsVerified)
      return fail("Results are already verified; disqualification is locked.");
    const changed = await db.transaction([
      db`SELECT id FROM competition WHERE id=${c.id}::uuid FOR UPDATE`,
      db`UPDATE competition_participants SET status='disqualified',disqualify_reason=${input.reason},ledger_version=ledger_version+1 WHERE competition_id=${c.id}::uuid AND user_email=${input.email}
        AND EXISTS (SELECT 1 FROM competition WHERE id=${c.id}::uuid AND NOT results_verified) RETURNING id`,
      db`UPDATE competition SET revision=revision+1 WHERE id=${c.id}::uuid`,
    ]);
    invalidateBoard();
    return changed[1].length
      ? { ok: true }
      : fail("Participant missing or results already locked.");
  }
  if (input.action === "resolveFlag") {
    await db`UPDATE competition_review_flags SET resolved=true WHERE id=${input.id}::uuid AND competition_id=${c.id}::uuid`;
    return { ok: true };
  }
  if (input.action === "verifyResults") {
    if (c.status !== "ended") return fail("End the season first.");
    const [{ n }] =
      await db`SELECT count(*)::int n FROM competition_review_flags WHERE competition_id=${c.id}::uuid AND NOT resolved`;
    if (Number(n) > 0)
      return fail("Resolve all anti-gaming review flags first.");
    const board = await leaderboard(c, true);
    if (board.delayed || board.rows.some((r) => r.snapshots !== 5))
      return fail("Closing snapshots are incomplete.");
    await db`UPDATE competition SET results_verified=true,revision=revision+1 WHERE id=${c.id}::uuid AND status='ended'`;
    invalidateBoard();
    return { ok: true };
  }
  await db`INSERT INTO competition_events(competition_id,user_email,event)
    SELECT competition_id,user_email,${input.event} FROM competition_participants WHERE competition_id=${c.id}::uuid AND email_opt_in AND status='active'
    ON CONFLICT DO NOTHING`;
  return { ok: true };
}

/** Email-bearing admin-only view, never reused for public leaderboard. */
export async function adminOverview() {
  const c = await currentCompetition();
  if (!c)
    return {
      competition: null,
      participants: [],
      flags: [],
      instruments: [],
      actions: [],
      events: [],
    };
  const db = sql();
  const [participants, flags, instruments, actions, events] = await Promise.all(
    [
      db`SELECT user_email,display_name,status,disqualify_reason FROM competition_participants WHERE competition_id=${c.id}::uuid`,
      db`SELECT id,user_email,reason,resolved FROM competition_review_flags WHERE competition_id=${c.id}::uuid ORDER BY created_at DESC`,
      db`SELECT * FROM competition_instruments ORDER BY symbol`,
      db`SELECT * FROM competition_splits WHERE competition_id=${c.id}::uuid`,
      db`SELECT id,user_email,event,delivered FROM competition_events WHERE competition_id=${c.id}::uuid ORDER BY created_at DESC`,
    ],
  );
  return { competition: c, participants, flags, instruments, actions, events };
}

export async function certificateRecipients() {
  const c = await currentCompetition();
  if (!c || c.status !== "ended" || !c.resultsVerified) return null;
  const ledger = await loadLedger(c.id);
  const people =
    await sql()`SELECT user_email,display_name,status FROM competition_participants WHERE competition_id=${c.id}::uuid`;
  const board = await leaderboard(c, true);
  let eligibleRank = 0;
  const eligibleNames = new Map(
    board.rows
      .filter((r) => r.eligible && r.rank !== null)
      .map((r) => [r.displayName, ++eligibleRank]),
  );
  return {
    c,
    recipients: people.flatMap((p) => {
      const book = getHoldings(
        ledger.trades.filter((t) => t.email === p.user_email),
        ledger.actions,
        c.startingCapital,
        Date.parse(c.endsAt),
      );
      if (p.status !== "active" || book.symbolsTraded.length < 5) return [];
      const row = board.rows.find((r) => r.displayName === p.display_name);
      // Names are unique within a season (registration enforces below); only eligible participants receive prizes.
      if (!row?.eligible || row.rank === null) return [];
      const prizeRank = eligibleNames.get(String(p.display_name))!;
      return [
        {
          email: String(p.user_email),
          name: String(p.display_name),
          kind:
            prizeRank === 1
              ? ("Champion" as const)
              : prizeRank <= c.finalistCount
                ? ("Excellence" as const)
                : ("Participation" as const),
        },
      ];
    }),
  };
}
