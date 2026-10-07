import { PublicHeader } from "@/components/layout/public-header";
import { JsonLd } from "@/components/seo/json-ld";
import { LEARN_ARTICLES } from "@/lib/learn/articles";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import { SemanticSearchBox } from "@/components/ui/semantic-search-box";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Learn — guides for Indian market research",
  description:
    "Plain-language guides on IPOs, screeners, index valuation, and portfolio basics — linked to tools on Market Intelligence.",
  path: "/learn",
});

export default function LearnHubPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: LEARN_ARTICLES.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/learn/${a.slug}`),
      name: a.title,
    })),
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <PublicHeader backHref="/" backLabel="Home" />
      <main className="mx-auto max-w-3xl flex-1 px-4 sm:px-6 py-10 sm:py-16 text-foreground w-full">
        <JsonLd data={itemList} />
      <h1 className="mt-4 text-3xl font-semibold">Learn</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        One question per guide — definitions, limits, and a link to the matching tool. Not investment advice.
      </p>
      <div className="mt-6">
        <SemanticSearchBox corpus="learn" placeholder="Search guides (e.g. &quot;how do IPOs get priced&quot;)" />
      </div>
      <ul className="mt-8 space-y-4">
        {LEARN_ARTICLES.map((a) => (
          <li key={a.slug} className="rounded-lg border border-border bg-card p-4">
            <Link href={`/learn/${a.slug}`} className="text-lg font-semibold text-primary hover:underline">
              {a.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Updated {a.updated} ·{" "}
              <Link href={a.productHref} className="font-medium text-foreground hover:underline">
                {a.productLabel} →
              </Link>
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-16 pt-8 border-t border-border flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
          ← Back to Home
        </Link>
        <Link href="/Home" className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-600/90 transition-all hover:scale-105 active:scale-95">
          Open Terminal →
        </Link>
      </div>
    </main>
  </div>
  );
}
