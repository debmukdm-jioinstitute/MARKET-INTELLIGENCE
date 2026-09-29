import { JsonLd } from "@/components/seo/json-ld";
import { buildResearchDetail } from "@/lib/feeds/research-detail";
import { absoluteUrl, formatSeoDate, pageMetadata } from "@/lib/seo/metadata";
import { notFound } from "next/navigation";
import { ResearchSymbolClient } from "./research-symbol-client";
import { SymbolSeoHeader } from "./symbol-seo-header";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ symbol: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw).toUpperCase();
  const data = await buildResearchDetail(symbol);
  if (!data) {
    return pageMetadata({
      title: "Symbol not found",
      description: "No research dossier for this ticker on Market Intelligence.",
      path: `/research/${encodeURIComponent(symbol)}`,
      noIndex: true,
    });
  }
  const date = formatSeoDate(data.fetchedAt);
  return pageMetadata({
    title: `${data.name} Share Price Today (NSE) — Chart & Fundamentals`,
    description: `${data.name} (${data.symbol}) share price today on NSE/BSE, live chart, P/E, ROE, financials and research — updated ${date}.`,
    path: `/research/${encodeURIComponent(data.symbol)}`,
  });
}

export default async function ResearchSymbolPage({ params }: PageProps) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw).toUpperCase();
  const data = await buildResearchDetail(symbol);
  if (!data) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Corporation",
    name: data.name,
    tickerSymbol: data.symbol,
    url: absoluteUrl(`/research/${encodeURIComponent(data.symbol)}`),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <SymbolSeoHeader data={data} />
      <ResearchSymbolClient symbol={data.symbol} initialData={data} />
    </>
  );
}
