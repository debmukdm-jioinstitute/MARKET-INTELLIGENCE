import { HubPage } from "@/components/hub/hub-page";
import { HubCta } from "@/components/hub/hub-section";
import FlowsGlance from "@/components/hub/flows-glance";
import { StressSlice } from "@/components/hub/stress-slice";
import { TsPathCharts } from "@/components/ts-charts/ts-path-charts";
import { pageMetadata } from "@/lib/seo/metadata";
import IndiaMarkets from "@/app/(portal)/markets/india/page";
import WorldIndices from "@/app/(portal)/macro/indices/page";
import Currency from "@/app/(portal)/macro/currency/page";
import Commodities from "@/app/(portal)/macro/commodities/page";
import Breadth from "@/app/(portal)/markets/breadth/page";
import Sectors from "@/app/(portal)/markets/sectors/page";
import Valuation from "@/app/(portal)/valuation/page";
import Activity from "@/app/(portal)/activity/page";
import FearGreed from "@/app/(portal)/fear-and-greed/page";

export const metadata = pageMetadata({
  title: "Markets: India, world, breadth, valuation and mood",
  description: "India and world tape, currency, commodities, breadth, sectors, valuation, activity, fear and greed and market stress on one page.",
  path: "/markets",
});

export default function MarketsHub() {
  return (
    <HubPage
      hub="markets"
      minHeights={{ india: 520 }}
      slots={{
        india: (<><IndiaMarkets /><TsPathCharts path="/markets?section=india" /><TsPathCharts path="/markets" title="Market breadth history" /></>),
        world: (<><WorldIndices /><TsPathCharts path="/economy?section=macro-stress" title="Global stress: US volatility, financial conditions and credit" /><StressSlice kind="global" /></>),
        currency: (<><Currency /><TsPathCharts path="/markets?section=currency" /></>),
        commodities: (<><Commodities /><TsPathCharts path="/markets?section=commodities" /></>),
        breadth: (<><Breadth /><TsPathCharts path="/markets?section=breadth" /></>),
        sectors: <Sectors />,
        valuation: (<><Valuation /><TsPathCharts path="/markets?section=valuation" title="Index P/E and P/B against their usual range" /></>),
        activity: (<><Activity /><TsPathCharts path="/markets?section=activity" /></>),
        "fear-greed": (<><FearGreed /><TsPathCharts path="/markets?section=fear-greed" /></>),
        "market-stress": <StressSlice kind="market" />,
        "flows-teaser": (
          <>
            <HubCta href="/funds?section=institutional" title="Institutional flows" text="FII and DII cash flows, participant positioning and ownership shares live under Funds & Flows." cta="Open flows" />
            <FlowsGlance />
          </>
        ),
      }}
    />
  );
}
