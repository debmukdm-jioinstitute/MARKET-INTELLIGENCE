import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { INDICATORS } from "@/lib/ts-charts/registry";
import { IndicatorView } from "@/components/ts-charts/indicator-view";

export const dynamicParams = false;
export const generateStaticParams = () => INDICATORS.map((c) => ({ slug: c.id.slice(2) }));

import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const def = INDICATORS.find((c) => c.id === `i.${slug}`);
  const title = def ? `${def.title} | Market Intelligence` : "Indicator";
  return pageMetadata({
    title,
    description: `${title} historical series and statistics.`,
    path: `/indicators/${slug}`,
  });
}

export default async function IndicatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const def = INDICATORS.find((c) => c.id === `i.${slug}`);
  if (!def) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-1 py-4">
      <Link href="/data?section=indicators" className="text-sm underline" style={{ color: "var(--ink-3)" }}>All indicators</Link>
      <IndicatorView id={def.id} slug={slug} />
    </div>
  );
}
