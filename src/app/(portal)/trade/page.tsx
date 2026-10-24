import { HubPage } from "@/components/hub/hub-page";
import { HubCta } from "@/components/hub/hub-section";
import { TsPathCharts } from "@/components/ts-charts/ts-path-charts";
import { pageMetadata } from "@/lib/seo/metadata";
import Alerts from "@/app/(portal)/intelligence/alerts/page";
import AiSignals from "@/app/(portal)/intelligence/ai-signals/page";
import Backtesting from "@/app/(portal)/intelligence/backtesting/page";
import Derivatives from "@/app/(portal)/markets/derivatives/page";

export const metadata = pageMetadata({
  title: "Trade: scanner, Trade Lab, alerts, options flow and signals",
  description: "Stock scanner, Trade Lab, alerts, options flow, AI signals, backtesting and derivatives in one place.",
  path: "/trade",
});

export default function TradeHub() {
  return (
    <HubPage
      hub="trade"
      fullHrefs={{ scanner: "/intelligence/scanner", lab: "/intelligence/trade-lab", "options-flow": "/research/options-flow" }}
      slots={{
        scanner: <HubCta href="/intelligence/scanner" title="Stock Scanner" text="Nifty 500 scans with margin-trading context. It runs full screen." cta="Open Scanner" />,
        lab: <HubCta href="/intelligence/trade-lab" title="Trade Lab" text="RSI, MACD and 13 more indicators, chart patterns and backtests for any index or F&O stock." cta="Open Trade Lab" />,
        alerts: <Alerts />,
        "options-flow": <HubCta href="/research/options-flow" title="Options Flow" text="Unusual activity across the options tape. It runs full screen." cta="Open Options Flow" />,
        "ai-signals": <AiSignals />,
        backtesting: <Backtesting />,
        derivatives: (<><Derivatives /><TsPathCharts path="/trade?section=derivatives" /><HubCta href="/markets?section=activity" title="Market activity" text="Cash turnover and index-futures positioning sit under Markets." cta="Open Markets" /></>),
      }}
    />
  );
}
