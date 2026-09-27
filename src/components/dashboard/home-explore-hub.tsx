"use client";

import { useNavSections } from "@/components/layout/app-nav";
import { SECTION_LANDING_HREF, type NavGroup, type NavSection } from "@/lib/nav-columns";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Compass } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function GroupBlock({ group }: { group: NavGroup }) {
  const links = group.items.filter((i) => !i.external);
  if (!links.length) return null;
  return (
    <div className="rounded-xl border border-border/80 bg-card/60 p-3">
      <p className="text-sm font-semibold text-foreground">
        {group.label}
        {group.badge ? (
          <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{group.badge}</span>
        ) : null}
      </p>
      {group.desc ? <p className="mt-0.5 text-xs text-muted-foreground">{group.desc}</p> : null}
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition touch-manipulation hover:border-primary/40 hover:bg-accent active:scale-[0.98]"
            >
              {item.label}
              {item.badge ? (
                <span className="rounded bg-blue-600/15 px-1 text-[10px] font-bold text-blue-600">{item.badge}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeExploreHub() {
  const sections = useNavSections();
  const titles = useMemo(() => sections.map((s) => s.title), [sections]);
  const [active, setActive] = useState("Today");

  useEffect(() => {
    if (titles.length && !titles.includes(active)) setActive(titles[0]!);
  }, [titles, active]);

  const section: NavSection | undefined = sections.find((s) => s.title === active) ?? sections[0];
  const landing = section ? SECTION_LANDING_HREF[section.title] : "/Home";

  return (
    <section className="bento-card-shell bento-card-stack">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-blue-600">
            <Compass className="size-4" aria-hidden />
            Explore the portal
          </p>
          <h2 className="mt-1 text-lg font-bold text-foreground">Nested pages by what you want to do</h2>
          <p className="mt-1 text-sm text-muted-foreground">Same structure as the menu — jump straight to sub-pages without digging.</p>
        </div>
        {section && landing ? (
          <Link
            href={landing}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-accent/40 px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-accent"
          >
            {section.title} hub
            <ArrowUpRight className="size-3.5" />
          </Link>
        ) : null}
      </div>

      <div
        className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Portal sections"
      >
        {sections.map((sec) => {
          const on = sec.title === section?.title;
          return (
            <button
              key={sec.title}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(sec.title)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition touch-manipulation",
                on ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {sec.title === "My Portfolio" ? "Portfolio" : sec.title === "Data & Tools" ? "Tools" : sec.title}
            </button>
          );
        })}
      </div>

      {section ? (
        <div className="grid gap-3 md:grid-cols-2">
          {section.groups.map((g) => (
            <GroupBlock key={g.label} group={g} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
