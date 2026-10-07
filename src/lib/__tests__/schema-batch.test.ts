import { describe, expect, it, vi } from "vitest";
import { runDdl } from "@/lib/db";
import { collectCompetitionSchema } from "@/lib/competition/schema";

type Fake = Parameters<typeof runDdl>[0];
const fake = (opts: { failTransaction?: boolean } = {}) => {
  const calls = { transaction: 0, query: [] as string[] };
  const db = {
    query: vi.fn((t: string) => {
      calls.query.push(t);
      return t as unknown;
    }),
    transaction: vi.fn(async () => {
      calls.transaction++;
      if (opts.failTransaction) throw new Error("deadlock detected");
    }),
  };
  return { db: db as unknown as Fake, calls };
};

describe("schema DDL batching", () => {
  it("sends all statements in one transaction round trip", async () => {
    const { db, calls } = fake();
    await runDdl(db, ["CREATE TABLE IF NOT EXISTS a (x int)", "CREATE INDEX IF NOT EXISTS i ON a(x)"]);
    expect(calls.transaction).toBe(1);
    expect(calls.query).toHaveLength(2);
  });
  it("falls back to sequential statements when the batch is refused", async () => {
    const { db, calls } = fake({ failTransaction: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await runDdl(db, ["A", "B", "C"]);
    expect(calls.transaction).toBe(1);
    expect(calls.query.slice(-3)).toEqual(["A", "B", "C"]);
    warn.mockRestore();
  });
  it("competition schema contributes only idempotent statements", () => {
    const ddl: string[] = [];
    collectCompetitionSchema(ddl);
    expect(ddl.length).toBeGreaterThan(10);
    for (const t of ddl) expect(t).toMatch(/IF NOT EXISTS|ADD COLUMN IF NOT EXISTS|CREATE OR REPLACE|DO \$\$|ALTER TABLE/i);
  });
});
