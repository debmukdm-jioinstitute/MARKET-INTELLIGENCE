import { LandingV2Page } from "@/components/marketing/landing-v2/landing-v2-page";
import type { SiteWideExecutiveBrief } from "@/lib/brief/site-wide-brief";
import type { ResearchDetailPayload } from "@/lib/feeds/research-detail";
import type { LandingDashboardSeed } from "@/components/marketing/landing-v2/landing-dashboard-context";
import type { ProofSymbol } from "@/lib/marketing/landing-v2/copy";

export function LandingPage({
  initialDashboard = null,
  researchBySymbol = {},
  siteBrief = null,
}: {
  initialDashboard?: LandingDashboardSeed | null;
  researchBySymbol?: Partial<Record<ProofSymbol, ResearchDetailPayload>>;
  siteBrief?: SiteWideExecutiveBrief | null;
}) {
  return (
    <LandingV2Page
      initialDashboard={initialDashboard}
      researchBySymbol={researchBySymbol}
      siteBrief={siteBrief}
    />
  );
}
