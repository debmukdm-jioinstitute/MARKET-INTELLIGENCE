import type { LearnChapter, LearnModule } from "./types";
import { FOUNDATIONS } from "./content/m1-foundations";
import { IPO_PRIMARY } from "./content/m2-ipo";
import { FUNDAMENTALS } from "./content/m3-fundamentals";
import { TECHNICAL } from "./content/m4-technical";
import { DERIVATIVES } from "./content/m5-derivatives";
import { MACRO } from "./content/m6-macro";
import { OWNERSHIP } from "./content/m7-ownership";
import { SENTIMENT } from "./content/m8-sentiment";
import { PORTFOLIO } from "./content/m9-portfolio";
import { DATA_TRUST } from "./content/m10-data-trust";

/** Ordered like a course: foundations first, platform tour last. */
export const LEARN_MODULES: LearnModule[] = [
  FOUNDATIONS,
  IPO_PRIMARY,
  FUNDAMENTALS,
  TECHNICAL,
  DERIVATIVES,
  MACRO,
  OWNERSHIP,
  SENTIMENT,
  PORTFOLIO,
  DATA_TRUST,
];

export const LEARN_UPDATED = "2026-10-09";

export function getModule(slug: string): LearnModule | undefined {
  return LEARN_MODULES.find((m) => m.slug === slug);
}

export function getChapter(moduleSlug: string, chapterSlug: string): LearnChapter | undefined {
  return getModule(moduleSlug)?.chapters.find((c) => c.slug === chapterSlug);
}

export function chapterHref(moduleSlug: string, chapterSlug: string): string {
  return `/learn/${moduleSlug}/${chapterSlug}`;
}

/** Resolve a "module/chapter" key used in `related`. */
export function resolveKey(key: string): { module: LearnModule; chapter: LearnChapter; href: string } | undefined {
  const [m, c] = key.split("/");
  if (!m || !c) return undefined;
  const mod = getModule(m);
  const chapter = mod?.chapters.find((x) => x.slug === c);
  return mod && chapter ? { module: mod, chapter, href: chapterHref(m, c) } : undefined;
}

/** Flat reading order across the whole curriculum, for global prev/next. */
export function flatChapters(): { module: LearnModule; chapter: LearnChapter; href: string }[] {
  return LEARN_MODULES.flatMap((mod) =>
    mod.chapters.map((chapter) => ({ module: mod, chapter, href: chapterHref(mod.slug, chapter.slug) })),
  );
}

export function chapterNeighbours(moduleSlug: string, chapterSlug: string) {
  const flat = flatChapters();
  const i = flat.findIndex((x) => x.module.slug === moduleSlug && x.chapter.slug === chapterSlug);
  return { prev: i > 0 ? flat[i - 1] : undefined, next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : undefined };
}

/** Old flat URLs (/learn/what-is-ipo-gmp) mapped to their new chapter URL. */
export function legacyRedirect(slug: string): string | undefined {
  for (const m of LEARN_MODULES) {
    const c = m.chapters.find((x) => x.legacySlug === slug);
    if (c) return chapterHref(m.slug, c.slug);
  }
  return undefined;
}

export function totalChapters(): number {
  return LEARN_MODULES.reduce((n, m) => n + m.chapters.length, 0);
}

/** Unique live-tool links across the curriculum (coverage metric). */
export function allToolHrefs(): string[] {
  return [...new Set(LEARN_MODULES.flatMap((m) => m.chapters.flatMap((c) => c.tools.map((t) => t.href.split("?")[0]!))))];
}
