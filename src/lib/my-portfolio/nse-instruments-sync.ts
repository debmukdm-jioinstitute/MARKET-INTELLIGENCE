import { ensureSchema, sql } from "@/lib/db";
import { feedFetch } from "@/lib/feeds/http";
import { gunzipSync } from "node:zlib";

const NSE_MASTER_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";

type NseRow = {
  segment: string;
  instrument_type: string;
  isin: string;
  trading_symbol: string;
  name: string;
  instrument_key: string;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function syncNseInstruments() {
  await ensureSchema();
  const res = await feedFetch(NSE_MASTER_URL, { timeoutMs: 30_000 });
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
  const gz = Buffer.from(await res.arrayBuffer());
  const json = JSON.parse(gunzipSync(gz).toString("utf-8")) as NseRow[];
  const equities = json.filter((r) => r.segment === "NSE_EQ" && r.instrument_type === "EQ" && r.isin);

  const db = sql();
  let upserted = 0;
  for (const batch of chunk(equities, 300)) {
    const values: string[] = [];
    const params: unknown[] = [];
    batch.forEach((row, i) => {
      const base = i * 4;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, now())`);
      params.push(row.isin, row.instrument_key, row.trading_symbol, row.name);
    });
    const text = `
      INSERT INTO nse_instruments (isin, instrument_key, trading_symbol, name, updated_at)
      VALUES ${values.join(", ")}
      ON CONFLICT (isin) DO UPDATE SET
        instrument_key = EXCLUDED.instrument_key,
        trading_symbol = EXCLUDED.trading_symbol,
        name = EXCLUDED.name,
        updated_at = now()
    `;
    await db.query(text, params);
    upserted += batch.length;
  }
  return { total: equities.length, upserted };
}
