import { PublicHeader } from "@/components/layout/public-header";
import { JsonLd } from "@/components/seo/json-ld";
import { LearnSidebar } from "@/components/learn/learn-sidebar";
import { LearnToolCards } from "@/components/learn/learn-tool-cards";
import { LEARN_MODULES, LEARN_UPDATED, chapterNeighbours, getChapter, getModule, resolveKey } from "@/lib/learn/curriculum";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = { slug: string; chapter: string };

export function generateStaticParams() {
  return LEARN_MODULES.flatMap((m) => m.chapters.map((c) => ({ slug: m.slug, chapter: c.slug })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug, chapter } = await params;
  const c = getChapter(slug, chapter);
  if (!c) return { title: "Chapter not found" };
  return pageMetadata({ title: c.title, description: c.summary, path: `/learn/${slug}/${chapter}` });
}

export default async function LearnChapterPage({ params }: { params: Promise<Params> }) {
  const { slug, chapter } = await params;
  const m = getModule(slug);
  const c = getChapter(slug, chapter);
  if (!m || !c) notFound();

  const idx = m.chapters.findIndex((x) => x.slug === c.slug);
  const { prev, next } = chapterNeighbours(m.slug, c.slug);
  const related = (c.related ?? []).map(resolveKey).filter((r) => r != null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.title,
    description: c.summary,
    dateModified: LEARN_UPDATED,
    isPartOf: { "@type": "Course", name: m.title, url: absoluteUrl(`/learn/${m.slug}`) },
    author: { "@type": "Organization", name: "Market Intelligence" },
    publisher: { "@type": "Organization", name: "Market Intelligence", url: absoluteUrl("/") },
    mainEntityOfPage: absoluteUrl(`/learn/${m.slug}/${c.slug}`),
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <PublicHeader backHref={`/learn/${m.slug}`} backLabel={m.title} />
      <main className="mx-auto max-w-6xl flex-1 px-4 sm:px-6 py-10 sm:py-14 w-full">
        <JsonLd data={jsonLd} />
        <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
          <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
            <LearnSidebar module={m} activeChapter={c.slug} />
          </aside>
          <article className="min-w-0 max-w-3xl">
            <details className="mb-4 rounded-xl border border-border bg-card p-3 lg:hidden">
              <summary className="cursor-pointer text-sm font-semibold">Chapters in {m.title}</summary>
              <div className="mt-2">
                <LearnSidebar module={m} activeChapter={c.slug} />
              </div>
            </details>
            <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
              <Link href="/learn" className="hover:underline">Learn</Link> /{" "}
              <Link href={`/learn/${m.slug}`} className="hover:underline">{m.title}</Link>
            </nav>
            <p className={cn("mt-3 text-sm font-semibold", m.accent.text)}>
              Chapter {idx + 1} of {m.chapters.length} · {c.minutes} min read
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{c.title}</h1>
            <p className="mt-3 text-muted-foreground">{c.summary}</p>

            {c.sections.map((sec, i) => (
              <section key={i} className="mt-8 space-y-3 text-sm leading-relaxed">
                {sec.heading ? <h2 className="text-lg font-semibold text-foreground">{sec.heading}</h2> : null}
                {sec.paragraphs.map((p) => (
                  <p key={p.slice(0, 32)} className="text-foreground/80">{p}</p>
                ))}
                {sec.bullets ? (
                  <ul className="list-disc space-y-1.5 pl-5 text-foreground/80">
                    {sec.bullets.map((b) => (
                      <li key={b.slice(0, 32)}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <section aria-label="Key takeaways" className={cn("mt-10 rounded-xl border p-5", m.accent.border, m.accent.bg)}>
              <h2 className="text-base font-semibold text-foreground">Key takeaways</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground/80">
                {c.takeaways.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>

            <LearnToolCards tools={c.tools} />

            {related.length > 0 ? (
              <section aria-label="Related chapters" className="mt-10">
                <h2 className="text-lg font-semibold">Keep learning</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {related.map((r) => (
                    <li key={r.href}>
                      <Link href={r.href} className="font-semibold text-primary hover:underline">{r.chapter.title}</Link>
                      <span className="text-muted-foreground"> · {r.module.title}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="mt-10 text-xs text-muted-foreground">
              Education only, not investment advice. Updated {LEARN_UPDATED}.
            </p>

            <div className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
              {prev ? (
                <Link href={prev.href} className="rounded-xl border border-border p-4 text-sm hover:border-primary/50">
                  <span className="text-xs text-muted-foreground">← Previous</span>
                  <span className="mt-0.5 block font-semibold">{prev.chapter.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link href={next.href} className="rounded-xl border border-border p-4 text-right text-sm hover:border-primary/50">
                  <span className="text-xs text-muted-foreground">Next →</span>
                  <span className="mt-0.5 block font-semibold">{next.chapter.title}</span>
                </Link>
              ) : null}
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
