import { LandingPage } from "@/components/marketing/landing-page";
import { buildSiteWideExecutiveBrief } from "@/lib/brief/site-wide-brief";
import { buildIndiaDashboardQuick } from "@/lib/feeds/india/build-dashboard";
import { buildResearchDetail } from "@/lib/feeds/research-detail";
import type { ProofSymbol } from "@/lib/marketing/landing-v2/copy";

export const revalidate = 120;

const PROOF_SEED_SYMBOLS: ProofSymbol[] = ["RELIANCE", "HDFCBANK", "TCS"];

export default async function Home() {
  const [initialDashboard, siteBrief, ...researchRows] = await Promise.all([
    buildIndiaDashboardQuick().catch(() => null),
    buildSiteWideExecutiveBrief().catch(() => null),
    ...PROOF_SEED_SYMBOLS.map((symbol) => buildResearchDetail(symbol).catch(() => null)),
  ]);
  const researchBySymbol = Object.fromEntries(
    PROOF_SEED_SYMBOLS.map((symbol, i) => [symbol, researchRows[i]]).filter(([, v]) => v != null),
  ) as Partial<Record<ProofSymbol, NonNullable<(typeof researchRows)[number]>>>;

  return (
    <LandingPage initialDashboard={initialDashboard} researchBySymbol={researchBySymbol} siteBrief={siteBrief} />
  );
}
