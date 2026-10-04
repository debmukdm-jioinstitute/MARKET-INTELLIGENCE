/** Optional real PostgreSQL-engine verification with PGlite installed OUTSIDE the repository.
 * COMPETITION_TEST_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node scripts/competition/verify-postgres.mjs
 * No product/runtime dependency is added. Schema SQL is read directly from schema.ts.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { PGlite } = await import(process.env.COMPETITION_TEST_PGLITE_MODULE);
const db = new PGlite();
// Test-only database clock: lets commit behavior be checked at 09:30 IST at any wall time.
await db.exec(`SET TIME ZONE 'UTC'; SET search_path TO public,pg_catalog;
  CREATE FUNCTION public.clock_timestamp() RETURNS timestamptz LANGUAGE sql AS $$ SELECT date_trunc('day',now())+interval '4 hours' $$;`);
const source = await readFile(
  new URL("../../src/lib/competition/schema.ts", import.meta.url),
  "utf8",
);
const statements = [...source.matchAll(/await db`([\s\S]*?)`;/g)].map((m) =>
  m[1].replaceAll("clock_timestamp()", "public.clock_timestamp()"),
);
for (const statement of statements) await db.exec(statement);
for (const statement of statements) await db.exec(statement); // idempotency
const [{ today, open, close }] = (
  await db.query(`SELECT to_char(now() AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') today,
 ((now() AT TIME ZONE 'Asia/Kolkata')::date+time '09:15') AT TIME ZONE 'Asia/Kolkata' AS open,
 ((now() AT TIME ZONE 'Asia/Kolkata')::date+time '15:30') AT TIME ZONE 'Asia/Kolkata' AS close`)
).rows;
const cid = "10000000-0000-4000-8000-000000000001";
const email = "fake@example.test";
await db.query(
  `INSERT INTO competition(id,slug,name,starts_at,ends_at,trading_days,finalist_count,status)
 VALUES($1,'test','Test',clock_timestamp()-interval '1 hour',clock_timestamp()+interval '1 hour',$2,3,'live')`,
  [cid, JSON.stringify([today])],
);
await db.query(
  `INSERT INTO competition_participants(competition_id,user_email,display_name,device_hash,terms_version)
 VALUES($1,$2,'Fake','test-hash','test')`,
  [cid, email],
);
await db.exec(
  `INSERT INTO competition_instruments(symbol,name,kind,circuit_locked) VALUES('RELIANCE','Reliance','equity',false)`,
);
const submit = async (version, rid) =>
  (
    await db.query(
      `SELECT competition_commit_order($1,$2,$3,0,'RELIANCE','BUY',100,100,10000,12,$4) result`,
      [cid, email, version, rid],
    )
  ).rows[0].result;
const id1 = "20000000-0000-4000-8000-000000000001";
const first = await submit(0, id1);
assert.equal(first.ok, true);
assert.equal((await submit(0, id1)).ok, true); // retry is idempotent
const race = await submit(0, "20000000-0000-4000-8000-000000000002");
assert.equal(race.ok, false);
assert.equal(race.status, 409);
assert.equal(
  (await db.query("SELECT count(*)::int n FROM competition_trades")).rows[0].n,
  1,
);
await assert.rejects(
  () => db.exec("DELETE FROM competition_trades"),
  /append-only/,
);
await db.exec(`UPDATE competition_participants SET status='disqualified'`);
assert.equal(
  (await submit(1, "20000000-0000-4000-8000-000000000003")).status,
  403,
);
await db.exec(`UPDATE competition SET status='ended'`);
assert.equal(
  (await submit(0, "20000000-0000-4000-8000-000000000004")).status,
  409,
);
await db.query(
  `INSERT INTO competition_snapshots(competition_id,user_email,day,value,prices) VALUES($1,$2,$3,1000000,'{}')`,
  [cid, email, today],
);
await assert.rejects(
  () => db.exec("UPDATE competition_snapshots SET value=1000001"),
  /append-only/,
);
await assert.rejects(
  () =>
    db.query(
      `INSERT INTO competition(slug,name,starts_at,ends_at,trading_days,finalist_count) VALUES('second','Second',$1,$2,'[]',3)`,
      [open, close],
    ),
  /competition_single_season/,
);
await db.close();
console.log(
  "PostgreSQL schema, constraints, append-only triggers and commit guards: PASS",
);
