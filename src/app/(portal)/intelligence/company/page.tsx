import { PageHeader } from "@/components/layout/page-header";
import { disclosuresMeta, latestDisclosures } from "@/lib/disclosures/store";
import { CompanyDisclosuresView } from "@/components/company/company-disclosures-view";

export const revalidate = 1800;

export const metadata = {
  title: "Company Intelligence | Market Intelligence",
  description:
    "Live NSE corporate announcements, concall filings, board resolutions, and AI-enriched investor updates for Indian listed equities.",
};

function formatAsOf(iso: string | null): string {
  if (!iso) return "Live";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Live";
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
  const [items, meta] = await Promise.all([latestDisclosures(60), disclosuresMeta()]);

  return (
    <div className="space-y-6">
      <PageHeader
        titleAs="h1"
        kicker="Investor Relations & Earnings Concalls"
        title="Company-Specific & Concall Intelligence"
        subtitle="Live exchange-published disclosures, concall transcripts, and board outcomes for Indian listed equities — continuously crawled, enriched with FinBERT AI sentiment, and linked to original regulatory filings."
        trust={{
          source: "NSE India (Regulation 30) · Hugging Face FinBERT AI",
          asOf: formatAsOf(meta.latestAt),
          methodology:
            "Disclosures are crawled directly from NSE India corporate announcements, analyzed via Hugging Face FinBERT models for tone & sentiment, and presented with direct links to official PDF exchange filings.",
        }}
      />

      <CompanyDisclosuresView initialItems={items} initialMeta={meta} />
    </div>
  );
}
