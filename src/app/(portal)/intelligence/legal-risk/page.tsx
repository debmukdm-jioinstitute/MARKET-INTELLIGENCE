import { pageMetadata } from "@/lib/seo/metadata";
import { LegalRiskDashboard } from "@/components/legal-risk/legal-risk-dashboard";

export const metadata = pageMetadata({
  title: "Legal & insolvency intelligence — corporate risk monitor",
  description:
    "Track NCLT, Supreme Court, High Courts, SEBI, CCI, ED, and RBI enforcement headlines mapped to company legal risk chains.",
  path: "/intelligence/legal-risk",
});

export default function LegalRiskPage() {
  return <LegalRiskDashboard />;
}
