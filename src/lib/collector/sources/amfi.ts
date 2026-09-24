import { getText } from "../http";
import type { Collector } from "../types";

const URL = "https://www.amfiindia.com/spages/NAVAll.txt";
/** Tracked benchmark funds (AMFI scheme codes, Direct Growth). Extend as the site needs. */
const TRACKED: Record<string, string> = {
  "149373": "Axis Nifty 50 Index Fund",
  "149466": "Axis Nifty Next 50 Index Fund",
  "152629": "Axis Nifty Bank Index Fund",
  "122639": "Parag Parikh Flexi Cap Fund",
  "118663": "Nippon India Gold Savings Fund",
};

const MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

/** NAVAll.txt: code;ISIN;ISIN2;name;plan;option;NAV;dd-Mon-yyyy */
export const amfi: Collector = {
  id: "amfi",
  async run() {
    const text = await getText(URL, { timeoutMs: 40_000 });
    const found = new Map<string, { nav: number; date: string }>();
    for (const line of text.split(/\r?\n/)) {
      const p = line.split(";");
      const code = p[0];
      if (!TRACKED[code]) continue;
      const nav = Number(p[p.length - 2]);
      const d = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(p[p.length - 1]?.trim() ?? "");
      if (Number.isFinite(nav) && nav > 0 && d) found.set(code, { nav, date: `${d[3]}-${MONTHS[d[2]]}-${d[1]}` });
    }
    if (!found.size) throw new Error("AMFI file layout changed");
    return [...found].map(([code, v]) => ({
      id: `amfi_nav_${code}`,
      label: `${TRACKED[code]} — NAV (Direct, Growth)`,
      unit: "₹",
      category: "funds" as const,
      provider: "AMFI",
      url: URL,
      obs: [{ date: v.date, value: v.nav }],
    }));
  },
};
