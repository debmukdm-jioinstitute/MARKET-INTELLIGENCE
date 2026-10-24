import { Suspense } from "react";
import { HubPage } from "@/components/hub/hub-page";
import { HubCta, HubSub } from "@/components/hub/hub-section";
import { TsPathCharts } from "@/components/ts-charts/ts-path-charts";
import { pageMetadata } from "@/lib/seo/metadata";
import CompanyPage from "@/app/(portal)/intelligence/company/page";
import BrokerConsensus from "@/app/(portal)/research/page";
import ResearchNotes from "@/app/(portal)/research-reports/page";
import Promoters from "@/app/(portal)/intelligence/promoters/page";
import Credit from "@/app/(portal)/intelligence/credit/page";
import LegalRisk from "@/app/(portal)/intelligence/legal-risk/page";
import Reddit from "@/app/(portal)/intelligence/reddit/page";
import SearchTrends from "@/app/(portal)/intelligence/search-trends/page";
import Ipo from "@/app/(portal)/research/ipo/page";
import Offers from "@/app/(portal)/research/offers/page";

export const revalidate = 1800;

export const metadata = pageMetadata({
  title: "Companies: research any listed company",
  description: "Company disclosures, ownership and risk, AI Desk, broker consensus, research notes, sentiment, IPOs and offers on one page.",
  path: "/companies",
});

const fallback = <div className="h-40 animate-pulse rounded-xl bg-muted/50" aria-hidden />;

export default function CompaniesHub() {
  return (
    <HubPage
      hub="companies"
      fullHrefs={{ "ai-desk": "/research/ai-desk" }}
      slots={{
        company: <Suspense fallback={fallback}><CompanyPage /></Suspense>,
        "company-stress": (
          <div className="space-y-6">
            <HubSub id="promoters" title="Promoter tracker"><Promoters /><TsPathCharts path="/companies?section=promoters" /></HubSub>
            <HubSub id="credit" title="Credit radar"><Credit /><TsPathCharts path="/companies?section=credit" /></HubSub>
            <HubSub id="legal-risk" title="Legal risk"><LegalRisk /></HubSub>
          </div>
        ),
        "ai-desk": <HubCta href="/research/ai-desk" title="AI Desk" text="Five AI analysts debate a stock with sources and factor backtests. It runs full screen." cta="Open AI Desk" />,
        "broker-consensus": <Suspense fallback={fallback}><BrokerConsensus /></Suspense>,
        "research-notes": <ResearchNotes />,
        "retail-sentiment": <Reddit />,
        "search-trends": <SearchTrends />,
        ipo: (<><Ipo /><TsPathCharts path="/companies?section=ipo" /></>),
        offers: <Offers />,
      }}
    />
  );
}
