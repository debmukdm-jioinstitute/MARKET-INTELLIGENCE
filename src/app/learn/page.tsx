import { PublicHeader } from "@/components/layout/public-header";
import { JsonLd } from "@/components/seo/json-ld";
import { LEARN_MODULES, chapterHref, totalChapters } from "@/lib/learn/curriculum";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import { SemanticSearchBox } from "@/components/ui/semantic-search-box";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Learn: the Market Intelligence library",
  description:
    "A chapter-by-chapter course on Indian markets: IPOs, fundamentals, technicals, derivatives, macro, flows, sentiment and portfolio risk, each linked to the live tool that applies it.",
  path: "/learn",
});

const START_PATH = [
  "market-foundations/stock-market-basics",
  "market-foundations/how-to-read-a-candlestick-chart",
  "ipo-primary-market/what-is-an-ipo",
  "fundamental-analysis/valuation-ratios-pe-pb-ev",
  "data-trust-and-ai/getting-started-with-market-intelligence",
] as const;

export default function LearnHubPage() {
  const chapters = totalChapters();
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: LEARN_MODULES.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/learn/${m.slug}`),
      name: m.title,
    })),
  };
  const start = START_PATH.map((key) => {
    const [ms, cs] = key.split("/");
    const m = LEARN_MODULES.find((x) => x.slug === ms);
    const c = m?.chapters.find((x) => x.slug === cs);
    return m && c ? { key, title: c.title, href: chapterHref(m.slug, c.slug), module: m.title } : null;
  }).filter((x) => x != null);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <PublicHeader backHref="/" backLabel="Home" />
      <main className="mx-auto max-w-6xl flex-1 px-4 sm:px-6 py-10 sm:py-14 w-full">
        <JsonLd data={itemList} />
        <header className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Learn</h1>
          <p className="mt-3 text-base text-muted-foreground">
            {LEARN_MODULES.length} modules, {chapters} chapters. Every concept is explained in plain language and linked to the live page on
            Market Intelligence where you can use it. Education only, not investment advice.
          </p>
        </header>
        <div className="mt-6 max-w-2xl">
          <SemanticSearchBox corpus="learn" placeholder={'Search chapters (e.g. "how do IPOs get priced")'} />
        </div>

        <section aria-label="Start here" className="mt-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">New here? Follow this path</h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {start.map((s, i) => (
              <li key={s.key}>
                <Link href={s.href} className="flex h-full flex-col rounded-xl border border-border p-3 text-sm hover:border-primary/50">
                  <span className="text-xs text-muted-foreground">Step {i + 1}</span>
                  <span className="mt-0.5 font-semibold leading-snug">{s.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Modules" className="mt-12">
          <h2 className="text-xl font-semibold">All modules</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {LEARN_MODULES.map((m, i) => (
              <li key={m.slug} className={cn("rounded-2xl border bg-card p-5", m.accent.border)}>
                <div className="flex items-start gap-3">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold tabular-nums", m.accent.bg, m.accent.text)}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <Link href={`/learn/${m.slug}`} className="text-lg font-semibold hover:underline">
                      {m.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {m.level} · {m.chapters.length} chapters · {m.chapters.reduce((n, c) => n + c.minutes, 0)} min
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{m.description}</p>
                <ol className="mt-3 space-y-1 text-sm">
                  {m.chapters.map((c, ci) => (
                    <li key={c.slug}>
                      <Link href={chapterHref(m.slug, c.slug)} className="flex gap-2 text-foreground/80 hover:text-primary hover:underline">
                        <span className="w-5 shrink-0 tabular-nums text-muted-foreground">{ci + 1}.</span>
                        <span>{c.title}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </section>

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
