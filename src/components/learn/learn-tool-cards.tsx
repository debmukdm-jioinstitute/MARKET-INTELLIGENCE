import type { LearnTool } from "@/lib/learn/types";
import Link from "next/link";

/** The "smart mapping": live pages that apply the concept just read. */
export function LearnToolCards({ tools, heading = "Put it into practice" }: { tools: LearnTool[]; heading?: string }) {
  if (tools.length === 0) return null;
  return (
    <section aria-label={heading} className="mt-10">
      <h2 className="text-lg font-semibold">{heading}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Open the live page on Market Intelligence and see this concept on real data.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {tools.map((t) => (
          <li key={t.href + t.label}>
            <Link
              href={t.href}
              className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <span className="text-sm font-semibold text-primary group-hover:underline">{t.label} →</span>
              <span className="mt-1 text-sm text-muted-foreground">{t.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
