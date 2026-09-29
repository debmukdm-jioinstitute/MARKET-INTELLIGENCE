import { getText, inRange } from "../../http";
import type { Obs } from "../../types";

const PIB_LIST = "https://pib.gov.in/indexd.aspx?reg=3&lang=1";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; MarketIntelligenceBot/1.0; +https://getmarketintelligence.in)",
  Accept: "text/html,application/xhtml+xml",
};

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

function strip(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function parseGstFromText(text: string): Obs | null {
  const m =
    /Gross\s+GST\s+revenue[^.]{0,160}?month\s+of\s+([A-Za-z]+)\s+(\d{4})[\s\S]{0,60}?(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)\s*(?:crore|Cr)\.?/i.exec(
      text,
    ) ??
    /GST\s+collection[s]?\s+for\s+([A-Za-z]+)\s+(\d{4})[\s\S]{0,60}?(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)\s*(?:crore|Cr)\.?/i.exec(
      text,
    );
  if (!m) return null;
  const mon = MONTHS[m[1]!.toLowerCase()];
  if (!mon) return null;
  const value = inRange("gst_cr", Number(m[3]!.replace(/,/g, "")), 50_000, 500_000);
  const date = `${m[2]}-${String(mon).padStart(2, "0")}-01`;
  return { date, value, meta: { sourceText: m[0].slice(0, 120) } };
}

/** Scrape latest MoF PIB GST release; returns one monthly observation when layout matches. */
export async function fetchLatestGstFromPib(): Promise<Obs | null> {
  const listHtml = await getText(PIB_LIST, { headers: HEADERS, timeoutMs: 25_000 });
  const prLinks = [...listHtml.matchAll(/PressReleasePage\.aspx\?PRID=(\d+)/gi)].map((m) => m[1]!);
  const gstLink = [...listHtml.matchAll(/PressReleasePage\.aspx\?PRID=(\d+)[^>]*>([^<]{0,200})/gi)].find((m) =>
    /gst|goods and services tax/i.test(m[2] ?? ""),
  );
  const candidates = gstLink ? [gstLink[1]!] : prLinks.slice(0, 8);
  for (const prid of candidates) {
    try {
      const page = strip(await getText(`https://pib.gov.in/PressReleasePage.aspx?PRID=${prid}`, { headers: HEADERS }));
      const obs = parseGstFromText(page);
      if (obs) return obs;
    } catch {
      /* try next */
    }
  }
  return null;
}

export function parseGstFromPressHtml(html: string): Obs | null {
  return parseGstFromText(strip(html));
}
