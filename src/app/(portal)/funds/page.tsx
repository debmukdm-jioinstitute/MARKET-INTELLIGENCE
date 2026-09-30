"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { FundSubnav, type FundTab } from "@/components/funds/fund-subnav";
import { AmcSourcesView } from "@/components/funds/amc-sources-view";

type FundSummary = {
  id: string;
  amfiCode: string;
  name: string;
  shortName: string;
  amc: string;
  category: string;
  benchmark: string;
  inceptionDate: string;
  disclosureUrl: string;
  nav: number | null;
  navDate: string | null;
};

function FundDirectory() {
  const [funds, setFunds] = useState<FundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/funds");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setFunds(data.funds ?? []);
      } catch {
        if (!cancelled) setError("Could not load live NAVs right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading live NAVs from AMFI…</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-sm text-muted-foreground">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Scheme identity from our registry; NAV resolved live from AMFI NAVAll.txt. Portfolio
        holdings, AUM and analytics are unavailable until AMC portfolio disclosures are
        ingested from a verified source.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {funds.map((f) => (
          <Link
            key={f.id}
            href={`/funds/${f.id}`}
            className="rounded-xl border border-border/60 bg-card p-4 hover:border-primary/50 transition-colors"
          >
            <div className="text-sm font-semibold">{f.shortName}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {f.amc} · {f.category}
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">NAV</span>
              <span className="text-lg font-semibold">
                {f.nav != null ? `₹${f.nav.toFixed(2)}` : "Unavailable"}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {f.navDate ? `as of ${f.navDate}` : "AMFI feed unreachable"}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function FundsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = (searchParams.get("tab") as FundTab) || "directory";
  const [activeTab, setActiveTab] = useState<FundTab>(
    tabParam === "sources" ? "sources" : "directory"
  );

  const handleTabChange = (tab: FundTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/funds?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Mutual Funds"
        title="Mutual Fund Directory"
        subtitle="Scheme registry with live AMFI NAVs. Portfolio-level analytics are unavailable until AMC disclosures are ingested from a verified source."
        trust={{
          source: "AMFI NAVAll.txt (live) · AMC monthly portfolio disclosures (SEBI Master Circular 2024)",
          asOf: "Live",
          methodology: "NAVs fetched on demand from AMFI and cached 15 minutes. No figures are estimated or stored.",
        }}
      />

      <FundSubnav activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="min-h-[500px]">
        {activeTab === "directory" && <FundDirectory />}
        {activeTab === "sources" && <AmcSourcesView />}
      </div>
    </div>
  );
}

export default function FundsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading Mutual Fund Directory...</div>}>
      <FundsContent />
    </Suspense>
  );
}
