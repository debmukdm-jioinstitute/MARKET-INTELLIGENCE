import Link from "next/link";
import { BookOpen, ChevronDown } from "lucide-react";
import { LEARN_ARTICLES } from "@/lib/learn/articles";
import { cardClass, HomeLink } from "./shared";

const slugs = [
  "how-to-read-a-candlestick-chart",
  "what-is-a-circuit-limit",
  "portfolio-diversification-basics",
];
export function LearnNudge() {
  return (
    <section aria-label="Learn">
      <details className={`${cardClass} group`}>
        <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600">
            <BookOpen className="size-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-stone-900">
              New here? Start here.
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Three simple guides for your next five minutes.
            </p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-stone-500 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {slugs
            .map((slug) => LEARN_ARTICLES.find((a) => a.slug === slug))
            .filter((a) => a != null)
            .map((a) => (
              <Link
                key={a.slug}
                href={`/learn/${a.slug}`}
                className="rounded-xl border border-stone-200 bg-stone-50 p-4 hover:border-teal-300"
              >
                <p className="text-[10px] font-medium text-teal-600">
                  5 min read
                </p>
                <h3 className="mt-2 text-sm font-semibold text-stone-900">
                  {a.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-500">
                  {a.description}
                </p>
              </Link>
            ))}
        </div>
        <div className="mt-3">
          <HomeLink href="/learn">Explore the learning library</HomeLink>
        </div>
      </details>
    </section>
  );
}
