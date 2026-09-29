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
    <main className="mx-auto max-w-3xl px-5 py-16 text-foreground">
      <JsonLd data={jsonLd} />
      <nav className="text-sm text-muted-foreground">
        <Link href="/learn" className="text-primary hover:underline">
          Learn
        </Link>
        {" · "}
        <Link href="/" className="hover:underline">
          Home
        </Link>
      </nav>
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
    </main>
  );
}
