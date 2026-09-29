"use client";

import { OffersHubLinks, OffersTable } from "@/components/offers/offers-table";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOffersReport } from "@/hooks/use-offers-report";
import type { OfferCategory } from "@/lib/feeds/offers/types";
import { useState } from "react";

const TABS: { value: OfferCategory; label: string }[] = [
  { value: "ncd", label: "NCD" },
  { value: "rights", label: "Rights" },
  { value: "buyback", label: "Buyback" },
  { value: "ofs", label: "OFS" },
  { value: "ncd-subscription", label: "NCD sub" },
];

export default function OffersPageClient() {
  const [category, setCategory] = useState<OfferCategory>("ncd");
  const { report, loading } = useOffersReport(category);

  return (
    <div className="portal-page">
      <PageHeader
        kicker="Primary market"
        title="NCD · Rights · Buyback · OFS"
        subtitle="Live calendars scraped from Chittorgarh.com report API — same tables as their NCD / RI / BB / OFS menus."
      />
      <Tabs value={category} onValueChange={(v) => setCategory(v as OfferCategory)}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <OffersTable report={category === t.value ? report : undefined} loading={loading && category === t.value} />
          </TabsContent>
        ))}
      </Tabs>
      <div className="mt-6">
        <OffersHubLinks />
      </div>
    </div>
  );
}
