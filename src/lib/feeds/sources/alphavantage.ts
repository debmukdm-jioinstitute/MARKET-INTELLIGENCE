import { feedFetch } from "@/lib/feeds/http";
import type { LiveQuote } from "@/lib/feeds/types";

export async function fetchAlphaVantageQuote(symbol: string): Promise<LiveQuote | null> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) return null;
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
    symbol,
  )}&apikey=${key}`;
  const res = await feedFetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
  const json = (await res.json()) as {
    "Global Quote"?: Record<string, string>;
  };
  const q = json["Global Quote"];
  if (!q?.["05. price"]) return null;
  const price = Number(q["05. price"]);
  const change = Number(q["09. change"] ?? 0);
  const changePct = Number((q["10. change percent"] ?? "0").replace("%", "")) / 100;
  return {
    symbol,
    price,
    change,
    changePct,
    asOf: new Date().toISOString(),
    provider: "alphavantage",
  };
}
