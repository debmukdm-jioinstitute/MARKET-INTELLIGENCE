import { HubPage } from "@/components/hub/hub-page";
import { HubCta } from "@/components/hub/hub-section";
import { pageMetadata } from "@/lib/seo/metadata";
import Sources from "@/app/(portal)/data/sources-section";
import Indicators from "@/app/(portal)/indicators/page";
import Health from "@/app/(portal)/data/health/page";
import Feeds from "@/app/(portal)/data/feeds/page";
import Export from "@/app/(portal)/data/export/page";

export const metadata = pageMetadata({
  title: "Data: sources, freshness and export",
  description: "Where every number comes from, how fresh it is, long-history indicators and Excel export.",
  path: "/data",
});

export default function DataHub() {
  return (
    <HubPage
      hub="data"
      slots={{
        sources: <Sources />,
        indicators: <Indicators />,
        health: <Health />,
        feeds: <Feeds />,
        "world-bank": <HubCta href="/economy?section=world-bank" title="World Bank data" text="The World Bank series for India and the US live under Economy, in Global Data." cta="Open Global Data" />,
        export: <Export />,
      }}
    />
  );
}
