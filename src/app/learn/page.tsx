import { JsonLd } from "@/components/seo/json-ld";
import { LEARN_ARTICLES } from "@/lib/learn/articles";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
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
    <main className="mx-auto max-w-3xl px-5 py-16 text-foreground">
      <JsonLd data={itemList} />
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Learn</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        One question per guide — definitions, limits, and a link to the matching tool. Not investment advice.
      </p>
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
    </main>
  );
}
