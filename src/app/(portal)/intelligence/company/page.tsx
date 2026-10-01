import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Building2, ArrowUpRight, ExternalLink, FileText, PhoneCall } from "lucide-react";
import { disclosuresMeta, latestDisclosures } from "@/lib/disclosures/store";

/**
 * Company & concall intelligence — now backed by a live, free IR disclosure
 * feed: NSE corporate announcements, collected twice daily (06:00 + 18:00 IST)
 * by the GitHub Actions disclosures runner into Postgres. Filings are shown
 * exactly as published (headline + original NSE PDF) — never estimated.
 *
 * Disclosures are identical for every visitor, so the page is ISR-cached for
 * 30 minutes. When the table is empty (no collector run yet / DB unreachable)
 * the honest empty state is preserved instead of fabricated profiles.
 */
export const revalidate = 1800;

export const metadata = {
  title: "Company Intelligence | Market Intelligence",
  description:
    "Live NSE corporate announcements: company disclosures, concall filings, and investor updates for Indian listed equities.",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) return "";
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const CONCALL_RE = /concall|conference call|earnings call|investor (meet|presentation)/i;

function isConcall(category: string, headline: string): boolean {
  return CONCALL_RE.test(`${category} ${headline}`);
}

function formatAsOf(iso: string | null): string {
  if (!iso) return "Unavailable";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unavailable";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export default async function CompanyIntelligencePage() {
  const [items, meta] = await Promise.all([latestDisclosures(40), disclosuresMeta()]);

  if (!items.length) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Investor Relations & Earnings Concalls"
        title="Company-Specific & Concall Intelligence"
        subtitle="Live exchange-published disclosures for Indian listed equities — concall schedules and transcripts, board outcomes, and investor updates, exactly as filed."
        trust={{
          source: "NSE India — corporate announcements (live feed)",
          asOf: formatAsOf(meta.latestAt),
          methodology:
            "Filings are collected twice daily (06:00 + 18:00 IST) from NSE's public corporate-announcements feed and shown verbatim with a link to the original PDF. We publish filings as filed — no estimates, no summaries invented by us.",
        }}
      />

      <section aria-label="Latest company disclosures" className="overflow-hidden rounded-2xl border border-border/80 bg-card">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">Latest disclosures</h2>
          <span className="text-xs text-muted-foreground">
            {meta.count} filings · refreshed twice daily
          </span>
        </div>
        <ul className="divide-y divide-border/60">
          {items.map((d) => {
            const concall = isConcall(d.category, d.headline);
            return (
              <li key={d.seqId} className="px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/research/${encodeURIComponent(d.symbol)}`}
                    className="text-sm font-bold text-foreground hover:underline"
                    title={`Research ${d.companyName}`}
                  >
                    {d.companyName}
                  </Link>
                  <span className="text-xs text-muted-foreground">{d.symbol}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {d.category}
                  </span>
                  {concall && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                      <PhoneCall className="size-3" /> Concall
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">{timeAgo(d.announcedAt)}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d.headline}</p>
                {d.pdfUrl && (
                  <a
                    href={d.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <FileText className="size-3.5" /> Original filing (PDF)
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3">
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
  );
}
