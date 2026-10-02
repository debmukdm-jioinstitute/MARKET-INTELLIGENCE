"use client";

import { IpoDetailSheet } from "@/components/ipo/ipo-detail-sheet";
import { IpoFunnelSection } from "@/components/ipo/ipo-funnel-section";
import { IpoList } from "@/components/ipo/ipo-list";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIpoList } from "@/hooks/use-ipo-list";
import type { IpoStatus } from "@/lib/feeds/ipo/types";
import { useState } from "react";

const STATUSES: { value: IpoStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "upcoming", label: "Upcoming" },
  { value: "listed", label: "Listed" },
  { value: "closed", label: "Closed" },
];

export default function IpoPage() {
  const [status, setStatus] = useState<IpoStatus>("open");
  const { ipos, loading } = useIpoList(status);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="portal-page">
      <PageHeader
        kicker="Primary market"
        title="IPO intelligence"
        subtitle="Calendar from Upstox · GMP (Chittorgarh / IPO Watch) · DRHP/RHP extract · SEBI/NSE/BSE/registrar source map · equity-research-style analyst memo on demand."
      />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Crawl targets: SEBI, NSE, BSE, exchange announcements, DRHP/RHP PDFs, registrar and lead-manager sites (company microsites via search until dedicated parsers ship).
        Fields marked <span className="font-semibold">planned</span> have honest placeholders — no fabricated issue break-ups or peer tables.
      </p>
      <IpoFunnelSection />
      <Tabs value={status} onValueChange={(v) => setStatus(v as IpoStatus)}>
        <TabsList>
          {STATUSES.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {STATUSES.map((s) => (
          <TabsContent key={s.value} value={s.value}>
            <IpoList ipos={ipos} loading={loading} onSelect={setSelectedId} />
          </TabsContent>
        ))}
      </Tabs>
      <IpoDetailSheet
        ipoId={selectedId}
        open={selectedId != null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
