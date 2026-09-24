import { getText } from "../http";
import type { Collector } from "../types";

const URL = "https://www.cftc.gov/dea/newcot/deacom.txt";
const CONTRACTS: { id: string; match: string; label: string }[] = [
  { id: "cot_es", match: "E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE", label: "S&P 500 E-mini" },
  { id: "cot_gold", match: "GOLD - COMMODITY EXCHANGE INC.", label: "Gold" },
  { id: "cot_wti", match: "CRUDE OIL, LIGHT SWEET-WTI - ICE FUTURES EUROPE", label: "WTI crude (ICE)" },
  { id: "cot_ust10", match: "UST 10Y NOTE - CHICAGO BOARD OF TRADE", label: "US 10Y note" },
];

function csv(line: string): string[] {
  return [...line.matchAll(/"([^"]*)"|([^,]+)/g)].map((m) => (m[1] ?? m[2]).trim());
}

/** Legacy COT (futures+options combined). cols: 7 OI, 8 non-comm long, 9 non-comm short. Latest week only — history builds from daily runs. */
export const cftc: Collector = {
  id: "cftc-cot",
  async run() {
    const rows = (await getText(URL)).split(/\r?\n/).filter(Boolean).map(csv);
    const out = CONTRACTS.flatMap((c) => {
      const r = rows.find((x) => x[0] === c.match);
      if (!r) return []; // contract renamed/dropped: skip it, fail only if all vanish
      const long = Number(r[8]);
      const short = Number(r[9]);
      const oi = Number(r[7]);
      if (![long, short, oi].every(Number.isFinite)) throw new Error(`COT columns changed for ${c.id}`);
      return [{
        id: `${c.id}_net_spec`,
        label: `${c.label} — net speculative (non-commercial) positions`,
        unit: "contracts",
        category: "positioning" as const,
        provider: "CFTC",
        url: URL,
        obs: [{ date: r[2], value: long - short, meta: { long, short, openInterest: oi } }],
      }];
    });
    if (!out.length) throw new Error("COT: no tracked contracts found (file layout changed)");
    return out;
  },
};
