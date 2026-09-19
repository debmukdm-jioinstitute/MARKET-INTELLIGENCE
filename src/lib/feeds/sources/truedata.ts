import WebSocket from "ws";
import type { LiveQuote } from "@/lib/feeds/types";

/**
 * TrueData real-time WebSocket — NSE/BSE/MCX-authorised vendor, used only as a
 * fallback when the primary quote sources (Yahoo/Stooq) have no data for a
 * symbol. There is no public REST "get quote" endpoint for real-time data;
 * TrueData's own reference client (https://wstest.truedata.in, view-source)
 * is the source of truth for this wire protocol:
 *   wss://push.truedata.in:8082?user=<id>&password=<pwd>&encoding=text
 *   → send {"method":"addsymbol","symbols":[...]}
 *   ← {"symbollist":{"<id>":["<symbol>", ...]}} once, mapping ids to symbols
 *   ← {"trade":[id, timestamp, ltp, ltq, atp, ttq, open, high, low, prevClose, ...]}
 *     per tick (field order per TrueData's "Real-Time Tick Streaming" docs).
 * Requires TRUEDATA_USERNAME / TRUEDATA_PASSWORD env vars; returns [] when
 * unconfigured so it never counts as a broken source on the health grid.
 */

const WS_URL = "wss://push.truedata.in:8082";
const CONNECT_TIMEOUT_MS = 8_000;

type TrueDataMessage = {
  trade?: (string | number)[];
  touchline?: (string | number)[];
  symbollist?: Record<string, (string | number)[]>;
};

export async function fetchTrueDataQuotes(symbols: string[]): Promise<LiveQuote[]> {
  const user = process.env.TRUEDATA_USERNAME;
  const password = process.env.TRUEDATA_PASSWORD;
  if (!user || !password || symbols.length === 0) return [];

  const url = `${WS_URL}?user=${encodeURIComponent(user)}&password=${encodeURIComponent(
    password,
  )}&encoding=text`;

  return new Promise<LiveQuote[]>((resolve) => {
    const idToSymbol = new Map<string, string>();
    const quotes = new Map<string, LiveQuote>();
    let settled = false;

    const ws = new WebSocket(url);

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ws.terminate();
      resolve([...quotes.values()]);
    };

    const timer = setTimeout(finish, CONNECT_TIMEOUT_MS);

    ws.on("open", () => {
      ws.send(JSON.stringify({ method: "addsymbol", symbols }));
    });

    ws.on("message", (raw) => {
      let msg: TrueDataMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.symbollist) {
        for (const [id, row] of Object.entries(msg.symbollist)) {
          const sym = row?.[0];
          if (typeof sym === "string") idToSymbol.set(id, sym);
        }
      }

      const row = msg.trade ?? msg.touchline;
      if (row && row.length >= 10) {
        const [symbolId, , ltp, , , , , , , prevClose] = row;
        const symbol = idToSymbol.get(String(symbolId));
        const price = Number(ltp);
        const prev = Number(prevClose);
        if (symbol && Number.isFinite(price) && price > 0) {
          const change = Number.isFinite(prev) && prev > 0 ? price - prev : 0;
          quotes.set(symbol, {
            symbol,
            price,
            change,
            changePct: prev > 0 ? change / prev : 0,
            asOf: new Date().toISOString(),
            provider: "truedata",
          });
        }
      }

      if (quotes.size >= symbols.length) finish();
    });

    ws.on("error", finish);
    ws.on("close", finish);
  });
}
