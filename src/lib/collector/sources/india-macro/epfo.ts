import { getText, inRange } from "../../http";
import type { Obs } from "../../types";

const EPFO_PRESS = "https://www.epfindia.gov.in/site_en/PressRelease.php";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0; +https://getmarketintelligence.in)",
  Accept: "text/html,application/xhtml+xml",
};

function strip(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

/** Parse EPFO net payroll addition from press release body (lakh subscribers). */
export function parseEpfoPayrollFromText(text: string): Obs | null {
  const m =
    /net\s+(?:payroll\s+)?addition[s]?\s+(?:of\s+)?([\d.]+)\s+lakh/i.exec(text) ??
    /([\d.]+)\s+lakh\s+(?:net\s+)?(?:new\s+)?subscribers/i.exec(text);
  if (!m) return null;
  const value = inRange("epfo_lakh", Number(m[1]), 5, 30);
  const month =
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i.exec(text);
  const date = month
    ? `${month[2]}-${String(MONTHS[month[1]!.toLowerCase()] ?? 1).padStart(2, "0")}-01`
    : `${new Date().toISOString().slice(0, 7)}-01`;
  return { date, value, meta: { matched: m[0] } };
}

export async function fetchLatestEpfoPayroll(): Promise<Obs | null> {
  const html = strip(await getText(EPFO_PRESS, { headers: HEADERS, timeoutMs: 25_000 }));
  return parseEpfoPayrollFromText(html);
}
