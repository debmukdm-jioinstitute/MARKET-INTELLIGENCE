"use client";

import { IpoDetailSheet } from "@/components/ipo/ipo-detail-sheet";
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
    <div className="space-y-6">
      <PageHeader
        kicker="Primary market"
        title="IPOs"
        subtitle="Mainboard & SME IPOs — price band, timeline, registrar, and prospectus, via Upstox."
      />
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
