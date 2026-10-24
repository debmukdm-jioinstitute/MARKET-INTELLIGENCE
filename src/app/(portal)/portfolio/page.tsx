import { HubPage } from "@/components/hub/hub-page";
import { pageMetadata } from "@/lib/seo/metadata";
import Overview from "@/app/(portal)/portfolio/portfolio-overview";
import Watchlist from "@/app/(portal)/portfolio/watchlist/page";
import Allocation from "@/app/(portal)/portfolio/allocation/page";
import TradeLog from "@/app/(portal)/portfolio/activity/page";
import Risk from "@/app/(portal)/portfolio/risk/page";
import Attribution from "@/app/(portal)/portfolio/attribution/page";
import Quant from "@/app/(portal)/portfolio/quant/page";
import Optimizer from "@/app/(portal)/portfolio/optimizer/page";
import Tax from "@/app/(portal)/portfolio/tax/page";

export const metadata = pageMetadata({
  title: "My Portfolio: holdings, risk and tax",
  description: "Track holdings, allocation, trade log, risk, attribution, factor exposure, optimizer and tax on one page.",
  path: "/portfolio",
});

export default function PortfolioHub() {
  return (
    <HubPage
      hub="portfolio"
      fullHrefs={{ watchlist: "/portfolio/watchlist", allocation: "/portfolio/allocation", activity: "/portfolio/activity", risk: "/portfolio/risk", attribution: "/portfolio/attribution", factors: "/portfolio/quant", optimizer: "/portfolio/optimizer", tax: "/portfolio/tax" }}
      slots={{
        overview: <Overview />,
        watchlist: <Watchlist />,
        allocation: <Allocation />,
        activity: <TradeLog />,
        risk: <Risk />,
        attribution: <Attribution />,
        factors: <Quant />,
        optimizer: <Optimizer />,
        tax: <Tax />,
      }}
    />
  );
}
