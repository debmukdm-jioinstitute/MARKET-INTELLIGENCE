import { LandingV2Page } from "@/components/marketing/landing-v2/landing-v2-page";
import type { LandingDashboardSeed } from "@/components/marketing/landing-v2/landing-dashboard-context";

export function LandingPage({ initialDashboard = null }: { initialDashboard?: LandingDashboardSeed | null }) {
  return <LandingV2Page initialDashboard={initialDashboard} />;
}
