import { notFound, redirect } from "next/navigation";
import { indexSlugFromLabel } from "@/lib/india-index-meta";
import { INDIA_BENCHMARK_DEFS, type IndiaBenchmarkDef } from "@/lib/feeds/india/indices";
import { IndexDetailClient } from "./index-detail-client";

/**
 * Legacy keys from the old ticker page (nifty50, sensex, banknifty, vix,
 * usdinr, brent, gold) map to the canonical slugs from india-index-meta.
 */
const LEGACY_LABELS: Record<string, string> = {
  nifty50: "Nifty 50",
  sensex: "SENSEX",
  banknifty: "Nifty Bank",
  vix: "India VIX",
  usdinr: "USD / INR",
  brent: "Brent Crude",
  gold: "Gold",
};

function defForSlug(slug: string): IndiaBenchmarkDef | null {
  for (const d of INDIA_BENCHMARK_DEFS) {
    if (indexSlugFromLabel(d.label) === slug) return d;
  }
  return null;
}

export default async function IndexDrilldownPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const key = symbol.toLowerCase().replace(/[^a-z0-9-]/g, "");

  let def = defForSlug(key);
  if (!def) {
    const legacyLabel = LEGACY_LABELS[key];
    const canonical = legacyLabel ? indexSlugFromLabel(legacyLabel) : null;
    if (canonical && canonical !== key) {
      redirect(`/markets/india/${canonical}`);
    }
    if (canonical) def = defForSlug(canonical);
  }
  if (!def) {
    // Legacy commodity/FX pages (usdinr, brent, gold) have no index
    // definition and their old content was fabricated — send users back
    // to the live index list instead of a dead end.
    if (LEGACY_LABELS[key]) redirect("/markets/india");
    notFound();
  }

  const slug = indexSlugFromLabel(def.label);
  if (!slug) notFound();

  return (
    <IndexDetailClient
      slug={slug}
      label={def.label}
      name={def.name}
      yahoo={def.yahoo}
      upstoxKey={def.upstoxKey}
    />
  );
}
