import { chapterHref } from "@/lib/learn/curriculum";
import type { LearnModule } from "@/lib/learn/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

/** Varsity-style chapter list for one module; the active chapter is highlighted. */
export function LearnSidebar({ module, activeChapter }: { module: LearnModule; activeChapter?: string }) {
  return (
    <nav aria-label={`${module.title} chapters`} className="rounded-xl border border-border bg-card p-3">
      <Link href={`/learn/${module.slug}`} className="block px-2 pb-2 text-sm font-semibold hover:underline">
        {module.title}
      </Link>
      <ol className="space-y-0.5">
        {module.chapters.map((c, i) => {
          const active = c.slug === activeChapter;
          return (
            <li key={c.slug}>
              <Link
                href={chapterHref(module.slug, c.slug)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex gap-2 rounded-lg px-2 py-1.5 text-sm leading-snug transition-colors",
                  active ? cn(module.accent.bg, module.accent.text, "font-semibold") : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="w-5 shrink-0 tabular-nums">{i + 1}.</span>
                <span>{c.title}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
