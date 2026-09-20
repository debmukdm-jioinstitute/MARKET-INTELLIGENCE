"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SectionNavItem {
  href: string;
  label: string;
  badge?: string;
}

/** In-page tab strip for switching between the sub-pages nested under a sidebar section. */
export function SectionNav({ items }: { items: SectionNavItem[] }) {
  const path = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-border">
      {items.map((item) => {
        const active = path === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors",
              active
                ? "text-amber-400"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {item.badge ? (
              <span
                className={cn(
                  "rounded px-1 text-[9px] font-bold uppercase",
                  item.badge === "NEW" ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-400",
                )}
              >
                {item.badge}
              </span>
            ) : null}
            {active ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-amber-400" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
