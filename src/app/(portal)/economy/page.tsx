import { HubPage } from "@/components/hub/hub-page";
import { TsPathCharts } from "@/components/ts-charts/ts-path-charts";
import CalendarSection from "@/components/hub/calendar-section";
import { pageMetadata } from "@/lib/seo/metadata";
import GlobalBoard from "@/app/(portal)/macro/page";
import IndiaMacro from "@/components/hub/india-macro-section";
import Rbi from "@/app/(portal)/macro/rbi/page";
import RbiDesk from "@/components/rbi/rbi-desk";
import Yields from "@/app/(portal)/macro/yields/page";
import GlobalData from "@/app/(portal)/macro/global/page";
import WorldBank from "@/app/(portal)/data/data360/page";
import MacroStress from "@/app/(portal)/macro/stress/page";
import Scenarios from "@/app/(portal)/macro/scenarios/page";
import Transmission from "@/app/(portal)/macro/transmission/page";

export const metadata = pageMetadata({
  title: "Economy: macro, RBI, yields and global data",
  description: "Global board, India macro, RBI and liquidity, yields, global data, macro stress, scenarios and shock transmission on one page.",
  path: "/economy",
});

export default function EconomyHub() {
  return (
    <HubPage
      hub="economy"
      minHeights={{ "global-board": 480 }}
      slots={{
        "global-board": (<><GlobalBoard /><TsPathCharts path="/economy" /></>),
        "india-macro": (<><IndiaMacro /><TsPathCharts path="/economy?section=india-macro" /></>),
        rbi: (<><Rbi /><TsPathCharts path="/economy?section=rbi" /><RbiDesk /></>),
        yields: (<><Yields /><TsPathCharts path="/economy?section=yields" /></>),
        "global-data": (<><GlobalData /><TsPathCharts path="/economy?section=global-data" /><div id="world-bank" className="mt-8 scroll-mt-28"><WorldBank /></div></>),
        "macro-stress": (<><MacroStress /><TsPathCharts path="/economy?section=macro-stress" /></>),
        scenarios: <Scenarios />,
        transmission: <Transmission />,
        calendar: <CalendarSection />,
      }}
    />
  );
}
