import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Building2, ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "Company Intelligence | Market Intelligence",
  description:
    "Company IR and concall intelligence. No verified live disclosure feed is connected yet.",
};

export default function CompanyIntelligencePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Investor Relations & Earnings Concalls"
        title="Company-Specific & Concall Intelligence"
        subtitle="Timelines of company disclosures, earnings concall summaries, and management tone tracking for Indian listed equities."
        trust={{
          source: "No live source connected",
          asOf: "Unavailable",
          methodology:
            "Company intelligence profiles are not published until a verified IR disclosure feed is connected. We do not show estimated or simulated profiles.",
        }}
      />

      <div className="rounded-2xl border border-border/80 bg-card p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted">
          <Building2 className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-foreground">
          Company intelligence profiles aren&apos;t available
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          No live IR disclosure feed is connected yet, so there are no company timelines,
          concall summaries, or tone trackers to show. We&apos;d rather show nothing than
          show estimated or simulated profiles.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/research"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Research a company <ArrowUpRight className="size-4" />
          </Link>
          <Link
            href="/intelligence"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/50"
          >
            Back to Intelligence
          </Link>
        </div>
      </div>
    </div>
  );
}
