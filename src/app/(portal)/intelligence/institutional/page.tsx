import { pageMetadata } from "@/lib/seo/metadata";
import { InstitutionalIntelligenceDashboard } from "@/components/institutional/institutional-intelligence-dashboard";

export const metadata = pageMetadata({
  title: "Institutional investor intelligence — FII, DII, MF smart money",
  description:
    "Track FII/FPI and DII flows, mutual-fund accumulation, and ownership signals with NSE, AMFI, and exchange filing sources.",
  path: "/intelligence/institutional",
});

export default function InstitutionalIntelligencePage() {
  return <InstitutionalIntelligenceDashboard />;
}
