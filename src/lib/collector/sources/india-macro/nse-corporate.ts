import { fetchNseAllIndices } from "@/lib/feeds/india/nse-market";
import { today } from "../../http";
import type { Obs } from "../../types";

/** Nifty 50 index level + 1Y percent change as live corporate/market proxy. */
export async function fetchNseCorporateProxy(): Promise<Obs[]> {
  const rows = await fetchNseAllIndices();
  const nifty = rows.find((r) => /NIFTY 50/i.test(r.index));
  if (!nifty) throw new Error("NSE allIndices: NIFTY 50 row missing");
  const last = Number((nifty as { last?: number }).last ?? (nifty as { lastPrice?: number }).lastPrice);
  const yoy = Number((nifty as { perChange365d?: number }).perChange365d);
  if (!Number.isFinite(last)) throw new Error("NSE NIFTY last invalid");
  const d = today();
  const out: Obs[] = [{ date: d, value: last, meta: { kind: "nifty50_level" } }];
  if (Number.isFinite(yoy)) {
    out.push({ date: d, value: yoy, meta: { kind: "nifty50_yoy_pct" } });
  }
  return out;
}
