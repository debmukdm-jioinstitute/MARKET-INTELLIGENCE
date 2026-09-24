import { getText } from "../http";
import type { Collector } from "../types";

const ID = "TRESEGINM052N";
const URL = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${ID}`;

/** India total reserves EXCLUDING gold (IMF via FRED), monthly, USD millions → shown in USD billions. Lags ~1–2 months. */
export const fredReserves: Collector = {
  id: "fred-reserves",
  async run() {
    const rows = (await getText(URL)).trim().split(/\r?\n/).slice(1).slice(-120);
    const obs = rows.flatMap((l) => {
      const [d, v] = l.split(",");
      const n = Number(v);
      return /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(n) && n > 0 ? [{ date: d, value: n / 1000 }] : [];
    });
    if (!obs.length) throw new Error("FRED reserves CSV empty/changed");
    return [{ id: "india_fx_reserves_ex_gold", label: "India FX reserves excl. gold (monthly, IMF via FRED)", unit: "$ bn", category: "macro", provider: "IMF via FRED", url: URL, obs }];
  },
};
