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
              "relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "text-blue-600"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {item.badge ? (
              <span
                className={cn(
                  "rounded px-1 text-[11px] font-bold uppercase",
                  item.badge === "NEW" ? "bg-primary/20 text-primary" : "bg-blue-600/20 text-blue-600",
                )}
              >
                {item.badge}
              </span>
            ) : null}
            {active ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-600" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
