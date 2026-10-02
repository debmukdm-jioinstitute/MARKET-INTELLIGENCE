import { LandingPage } from "@/components/marketing/landing-page";
import { buildIndiaDashboardQuick } from "@/lib/feeds/india/build-dashboard";

export const revalidate = 120;

export default async function Home() {
  const initialDashboard = await buildIndiaDashboardQuick().catch(() => null);
  return <LandingPage initialDashboard={initialDashboard} />;
}
