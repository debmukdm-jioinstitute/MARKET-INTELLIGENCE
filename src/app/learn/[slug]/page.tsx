import { PublicHeader } from "@/components/layout/public-header";
import { JsonLd } from "@/components/seo/json-ld";
import { LearnSidebar } from "@/components/learn/learn-sidebar";
import { LEARN_MODULES, chapterHref, getModule, legacyRedirect } from "@/lib/learn/curriculum";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

export function generateStaticParams() {
  return LEARN_MODULES.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = getModule(slug);
  if (!m) return { title: "Learn" };
  return pageMetadata({ title: `${m.title}: Learn`, description: m.description, path: `/learn/${slug}` });
}

/** /learn/<module> is a module page; any pre-curriculum article slug redirects to its chapter. */
export default async function LearnModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = getModule(slug);
  if (!m) {
    const target = legacyRedirect(slug);
    if (target) permanentRedirect(target);
    notFound();
  }
  const idx = LEARN_MODULES.findIndex((x) => x.slug === m.slug);
  const prev = LEARN_MODULES[idx - 1];
  const next = LEARN_MODULES[idx + 1];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: m.title,
    description: m.description,
    provider: { "@type": "Organization", name: "Market Intelligence", url: absoluteUrl("/") },
    hasPart: m.chapters.map((c) => ({ "@type": "LearningResource", name: c.title, url: absoluteUrl(chapterHref(m.slug, c.slug)) })),
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <PublicHeader backHref="/learn" backLabel="Learn" />
      <main className="mx-auto max-w-6xl flex-1 px-4 sm:px-6 py-10 sm:py-14 w-full">
        <JsonLd data={jsonLd} />
        <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
          <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
            <LearnSidebar module={m} />
          </aside>
          <div>
            <p className={cn("text-sm font-semibold", m.accent.text)}>
              Module {String(idx + 1).padStart(2, "0")} · {m.level}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{m.title}</h1>
            <p className="mt-3 text-muted-foreground">{m.description}</p>
            <ol className="mt-8 space-y-3">
              {m.chapters.map((c, i) => (
                <li key={c.slug}>
                  <Link
                    href={chapterHref(m.slug, c.slug)}
                    className="flex gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold tabular-nums", m.accent.bg, m.accent.text)}>
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{c.title}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{c.summary}</span>
                      <span className="mt-2 block text-xs text-muted-foreground">
                        {c.minutes} min read · Try it: {c.tools.map((t) => t.label).slice(0, 2).join(", ")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <div className="mt-12 flex flex-wrap justify-between gap-3 border-t border-border pt-6 text-sm">
              {prev ? (
                <Link href={`/learn/${prev.slug}`} className="font-semibold text-primary hover:underline">
                  ← {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link href={`/learn/${next.slug}`} className="font-semibold text-primary hover:underline">
                  {next.title} →
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
