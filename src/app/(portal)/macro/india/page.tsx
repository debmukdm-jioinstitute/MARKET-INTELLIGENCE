"use client";

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

      {loading && !data ? <p className="text-sm text-muted-foreground mb-4">Loading India macro…</p> : null}
      {error ? <p className="text-sm text-rose-600 mb-4">{error}</p> : null}

      <IndiaMacroBoard data={data} />

      <div id="calendar" className="mt-10 scroll-mt-20">
        <EconomicCalendarSection />
      </div>
    </div>
  );
}
