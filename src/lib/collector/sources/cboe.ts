import { getText } from "../http";
import type { Collector } from "../types";

const URL = "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv";

export const cboeVix: Collector = {
  id: "cboe-vix",
  async run() {
    const lines = (await getText(URL)).trim().split(/\r?\n/).slice(1).slice(-400);
    const obs = lines.flatMap((l) => {
      const [d, , , , close] = l.split(",");
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d ?? "");
      const v = Number(close);
      return m && Number.isFinite(v) && v > 0 && v < 200 ? [{ date: `${m[3]}-${m[1]}-${m[2]}`, value: v }] : [];
    });
    if (!obs.length) throw new Error("VIX CSV empty/changed");
    return [{ id: "cboe_vix", label: "CBOE VIX (close)", unit: "pts", category: "market", provider: "Cboe", url: URL, obs }];
  },
};
