import { getText, inRange, today } from "../http";
import type { Collector } from "../types";

const URL = "https://www.rbi.org.in/";
const FIELDS: { id: string; re: RegExp; label: string; max: number }[] = [
  { id: "rbi_repo", re: /Policy Repo Rate/i, label: "RBI policy repo rate", max: 15 },
  { id: "rbi_sdf", re: /Standing Deposit Facility Rate/i, label: "RBI standing deposit facility rate", max: 15 },
  { id: "rbi_msf", re: /Marginal Standing Facility Rate/i, label: "RBI marginal standing facility rate", max: 15 },
  { id: "rbi_bank_rate", re: /Bank Rate/i, label: "RBI bank rate", max: 15 },
  { id: "rbi_reverse_repo", re: /Fixed Reverse Repo Rate/i, label: "RBI fixed reverse repo rate", max: 15 },
  { id: "rbi_crr", re: /CRR/, label: "Cash reserve ratio", max: 15 },
  { id: "rbi_slr", re: /SLR/, label: "Statutory liquidity ratio", max: 40 },
];

/** Scrapes the rate widget on rbi.org.in's home page: <th>Label</th><td>: 5.25%</td>. */
export const rbi: Collector = {
  id: "rbi",
  async run() {
    const html = await getText(URL);
    const date = today();
    return FIELDS.map((f) => {
      const m = new RegExp(`<th[^>]*>\\s*(?:${f.re.source})\\s*</th>\\s*<td[^>]*>\\s*:?\\s*([0-9.]+)\\s*%`, f.re.flags).exec(html);
      if (!m) throw new Error(`RBI page layout changed: ${f.id} not found`);
      return {
        id: f.id,
        label: f.label,
        unit: "%",
        category: "rates" as const,
        provider: "Reserve Bank of India",
        url: URL,
        obs: [{ date, value: inRange(f.id, Number(m[1]), 0, f.max) }],
      };
    });
  },
};
