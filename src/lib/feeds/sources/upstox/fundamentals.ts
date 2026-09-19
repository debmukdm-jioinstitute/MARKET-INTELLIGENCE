import { feedFetch } from "@/lib/feeds/http";
import { UPSTOX_BASE_URL, upstoxHeaders } from "@/lib/feeds/sources/upstox/client";
import type { FundamentalsSnapshot, KeyRatio } from "@/lib/feeds/fundamentals/types";

type UpstoxKeyRatioRow = { name: string; company_value: string; sector_value: string };
type UpstoxKeyRatiosResponse = { status: string; data?: UpstoxKeyRatioRow[] };

function parseRatioValue(raw: string): { value: number | null; unitSuffix: KeyRatio["unitSuffix"] } {
  const isPct = raw.trim().endsWith("%");
  const n = Number(raw.replace("%", "").trim());
  return { value: Number.isFinite(n) ? n : null, unitSuffix: isPct ? "%" : "x" };
}

export async function fetchUpstoxKeyRatios(isin: string): Promise<FundamentalsSnapshot | null> {
  const headers = upstoxHeaders();
  if (!headers) return null;

  const url = `${UPSTOX_BASE_URL}/v2/fundamentals/${encodeURIComponent(isin)}/key-ratios`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox key ratios HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxKeyRatiosResponse;
  if (json.status !== "success" || !json.data) return null;

  const ratios: KeyRatio[] = json.data.map((r) => {
    const company = parseRatioValue(r.company_value);
    const sector = parseRatioValue(r.sector_value);
    return {
      name: r.name,
      companyValue: company.value,
      sectorValue: sector.value,
      unitSuffix: company.unitSuffix,
    };
  });

  return {
    isin,
    ratios,
    source: {
      provider: "Upstox",
      url: "https://upstox.com/developer/api-documentation/get-key-ratios/",
      asOf: new Date().toISOString(),
    },
  };
}
