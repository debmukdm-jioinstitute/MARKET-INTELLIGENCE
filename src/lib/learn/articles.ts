import { LEARN_MODULES, LEARN_UPDATED, chapterHref } from "./curriculum";

/** Flat article view kept for the sitemap, semantic search and home nudges. Derived from the curriculum. */
export type LearnArticle = {
  slug: string;
  href: string;
  title: string;
  description: string;
  published: string;
  updated: string;
  moduleTitle: string;
  productHref: string;
  productLabel: string;
};

export const LEARN_ARTICLES: LearnArticle[] = LEARN_MODULES.flatMap((m) =>
  m.chapters.map((c) => ({
    slug: c.legacySlug ?? c.slug,
    href: chapterHref(m.slug, c.slug),
    title: c.title,
    description: c.summary,
    published: "2026-09-01",
    updated: LEARN_UPDATED,
    moduleTitle: m.title,
    productHref: c.tools[0]?.href ?? "/Home",
    productLabel: c.tools[0]?.label ?? "Open terminal",
  })),
);

export function getLearnArticle(slug: string): LearnArticle | undefined {
  return LEARN_ARTICLES.find((a) => a.slug === slug);
}
