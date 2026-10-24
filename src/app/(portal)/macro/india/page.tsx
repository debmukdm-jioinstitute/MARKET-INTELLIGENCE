"use client";
import { DataStory } from "@/components/ui/data-story";
import { flowHeadline, macroDeck } from "@/lib/story";

import { EconomicCalendarSection } from "@/components/dashboard/economic-calendar-section";
import { IndiaMacroBoard } from "@/components/dashboard/india-macro-board";
import { ScrollToUrlSection } from "@/components/routing/scroll-to-url-section";
import { useIndiaDashboard } from "@/hooks/use-india-dashboard";
import { Suspense } from "react";

export default function IndiaMacroPage() {
  const { data, loading, error } = useIndiaDashboard(45_000);

  return (
    <div className="portal-page pb-10">
      <Suspense fallback={null}>
        <ScrollToUrlSection />
      </Suspense>

      <DataStory
        kicker="India macro"
        asOf={data?.fetchedAt}
        headline={flowHeadline(data?.moneyFlow.fii.today, data?.moneyFlow.dii.today)}
        deck={macroDeck(data?.indiaMacro ?? [])}
        howToRead="the headline is the latest net equity flow in ₹ crore by investor type; the line below lists the indicators that changed in their latest release."
      />

      {loading && !data ? <p className="text-sm text-muted-foreground mb-4">Loading India macro…</p> : null}
      {error ? <p className="text-sm text-rose-600 mb-4">{error}</p> : null}

      <IndiaMacroBoard data={data} />

      <div id="calendar" className="mt-10 scroll-mt-20">
        <EconomicCalendarSection />
      </div>
    </div>
  );
}
