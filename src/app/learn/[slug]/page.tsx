import { PublicHeader } from "@/components/layout/public-header";
import { JsonLd } from "@/components/seo/json-ld";
import { getLearnArticle, LEARN_ARTICLES } from "@/lib/learn/articles";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return LEARN_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getLearnArticle(slug);
  if (!article) return { title: "Article not found" };
  return pageMetadata({
    title: article.title,
    description: article.description,
    path: `/learn/${slug}`,
  });
}

export default async function LearnArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getLearnArticle(slug);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.published,
    dateModified: article.updated,
    author: { "@type": "Organization", name: "Market Intelligence" },
    publisher: { "@type": "Organization", name: "Market Intelligence", url: absoluteUrl("/") },
    mainEntityOfPage: absoluteUrl(`/learn/${slug}`),
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <PublicHeader backHref="/learn" backLabel="Learn" />
      <main className="mx-auto max-w-3xl flex-1 px-4 sm:px-6 py-10 sm:py-16 text-foreground w-full">
        <JsonLd data={jsonLd} />
      <h1 className="mt-4 text-3xl font-semibold">{article.title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        Published {article.published} · Updated {article.updated}
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{article.description}</p>
      {article.sections.map((sec, i) => (
        <section key={i} className="mt-8 space-y-3 text-sm leading-relaxed">
          {sec.heading ? <h2 className="text-lg font-semibold text-foreground">{sec.heading}</h2> : null}
          {sec.paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="text-muted-foreground">
              {p}
            </p>
          ))}
        </section>
      ))}
      <p className="mt-10 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        Try it on the site:{" "}
        <Link href={article.productHref} className="font-semibold text-primary hover:underline">
          {article.productLabel} →
        </Link>
      </p>
      <div className="mt-16 pt-8 border-t border-border flex flex-wrap items-center justify-between gap-4">
        <Link href="/learn" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
          ← Back to Learn Guides
        </Link>
        <Link href="/Home" className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-600/90 transition-all hover:scale-105 active:scale-95">
          Open Terminal →
        </Link>
      </div>
    </main>
  </div>
  );
}
