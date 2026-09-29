import { getText, inRange } from "../../http";
import type { Obs } from "../../types";

const RBI_HOME = "https://www.rbi.org.in/";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

function strip(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

/** Parse UPI monthly value (₹ lakh crore) from RBI/NPCI bulletin text when present. */
export function parseUpiValueFromText(text: string): Obs | null {
  const m =
    /UPI[^.]{0,80}?([\d.]+)\s*(?:lakh\s*)?(?:crore|bn)\b/i.exec(text) ??
    /Unified\s+Payments\s+Interface[^.]{0,120}?([\d.]+)\s*(?:lakh\s*)?crore/i.exec(text);
  if (!m) return null;
  const value = inRange("upi_lc", Number(m[1]), 5, 50);
  return { date: new Date().toISOString().slice(0, 7) + "-01", value, meta: { matched: m[0].slice(0, 80) } };
}

export async function fetchUpiFromRbiHome(): Promise<Obs | null> {
  const text = strip(await getText(RBI_HOME, { headers: HEADERS, timeoutMs: 25_000 }));
  return parseUpiValueFromText(text);
}
