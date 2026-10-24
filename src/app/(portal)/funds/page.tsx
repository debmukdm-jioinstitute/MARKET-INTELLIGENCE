import { HubPage } from "@/components/hub/hub-page";
import { HubCta } from "@/components/hub/hub-section";
import { TsPathCharts } from "@/components/ts-charts/ts-path-charts";
import { pageMetadata } from "@/lib/seo/metadata";
import Institutional from "@/app/(portal)/intelligence/institutional/page";
import FundsOverview from "@/app/(portal)/funds/funds-overview";
import Categories from "@/app/(portal)/funds/categories/page";
import Distribution from "@/app/(portal)/funds/distribution/page";
import Owners from "@/app/(portal)/funds/owners/page";
import Passive from "@/app/(portal)/funds/passive/page";
import States from "@/app/(portal)/funds/states/page";
import Size from "@/app/(portal)/funds/size/page";
import Etf from "@/app/(portal)/etf/page";
import Leverage from "@/app/(portal)/leverage/page";
import LeverageMtf from "@/app/(portal)/leverage/mtf/page";

export const metadata = pageMetadata({
  title: "Funds & Flows: FII/DII, mutual funds, ETFs and margin trading",
  description: "Institutional flows, mutual fund SIPs and AUM, fund categories, ETF spreads and margin trading on one page.",
  path: "/funds",
});

export default function FundsHub() {
  return (
    <HubPage
      hub="funds"
      slots={{
        institutional: (<><Institutional /><TsPathCharts path="/intelligence/institutional" /></>),
        "funds-overview": (<><FundsOverview /><TsPathCharts path="/funds" /></>),
        categories: (<><Categories /><TsPathCharts path="/funds/categories" /></>),
        "nfo-distribution": (<><Distribution /><TsPathCharts path="/funds/distribution" /></>),
        sip: (<><Owners /><TsPathCharts path="/funds/owners" /></>),
        passive: (<><Passive /><TsPathCharts path="/funds/passive" /></>),
        "geo-aum": (<><States /><TsPathCharts path="/funds/states" /></>),
        "scheme-size": (<><Size /><TsPathCharts path="/funds/size" /></>),
        etf: (<><Etf /><TsPathCharts path="/etf" /></>),
        mtf: (<><Leverage /><TsPathCharts path="/leverage" /><LeverageMtf /><TsPathCharts path="/leverage/mtf" /><HubCta href="/trade?section=leverage" title="Margin trading for traders" text="See the same margin book next to the scanner and derivatives tools." cta="Open Trade" /></>),
      }}
    />
  );
}
