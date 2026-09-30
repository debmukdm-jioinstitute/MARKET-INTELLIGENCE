"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ArrowLeft, ExternalLink } from "lucide-react";

type FundDetail = {
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

export default function FundDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || "";

  const [fund, setFund] = useState<FundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/funds/${encodeURIComponent(id)}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setFund(data.fund ?? null);
      } catch {
        if (!cancelled) setFund(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading fund details…</div>;
  }

  if (notFound || !fund) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold">Fund Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The mutual fund identifier &quot;{id}&quot; does not exist in our registry.
        </p>
        <Link href="/funds" className="text-sm text-primary underline">
          Return to Mutual Fund Directory
        </Link>
      </div>
    );
  }

  const rows: [string, string][] = [
    ["AMC", fund.amc],
    ["Category", fund.category],
    ["Benchmark", fund.benchmark],
    ["Inception", fund.inceptionDate],
    ["AMFI Code", fund.amfiCode],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/funds"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium px-2.5 py-1.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Fund Directory</span>
        </Link>
      </div>

      <PageHeader
        titleAs="h1"
        kicker="Mutual Fund"
        title={fund.name}
        subtitle={`${fund.shortName} (${fund.category}), benchmarked against ${fund.benchmark}.`}
        trust={{
          source: "AMFI NAVAll.txt (live NAV) · AMC official disclosures",
          asOf: "Live",
          methodology: "NAV fetched on demand from AMFI. Holdings-level analytics are unavailable until AMC portfolio disclosures are ingested from a verified source.",
        }}
      />

      <div className="rounded-xl border border-border/60 bg-card p-5 max-w-2xl">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Live NAV</span>
          <span className="text-2xl font-semibold">
            {fund.nav != null ? `₹${fund.nav.toFixed(2)}` : "Unavailable"}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground text-right">
          {fund.navDate ? `as of ${fund.navDate}` : "AMFI feed unreachable"}
        </div>

        <dl className="mt-5 space-y-2.5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium text-right">{value}</dd>
            </div>
          ))}
        </dl>

        <a
          href={fund.disclosureUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-primary underline"
        >
          Official AMC portfolio disclosure <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <p className="mt-4 text-xs text-muted-foreground">
          Holdings, sector and factor exposures, concentration and manager analytics are
          unavailable until AMC monthly portfolio disclosures are ingested from a
          verified source. We do not estimate or model these figures.
        </p>
      </div>
    </div>
  );
}
