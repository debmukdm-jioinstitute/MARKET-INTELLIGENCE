import { fetchFiiDii } from "@/lib/feeds/india/nse-market";
import { fiiDiiRowsToSeries } from "@/lib/feeds/india/fii-dii-store";
import type { Collector } from "../types";

/** Daily NSE FII/DII cash nets — same endpoint as Home money flow; stored for 5D/1M/YTD rollups. */
export const nseFiidii: Collector = {
  id: "nse-fiidii",
  async run() {
    const rows = await fetchFiiDii();
    const batch = fiiDiiRowsToSeries(rows);
    if (!batch.length) throw new Error("NSE fiidiiTradeReact returned no usable FII/DII rows");
    return batch;
  },
};
