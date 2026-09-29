"use client";

import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SectionNavItem {
  href: string;
  label: string;
  badge?: string;
}

/** In-page tab strip for switching between the sub-pages nested under a sidebar section. */
export function SectionNav({ items, className }: { items: SectionNavItem[]; className?: string }) {
  const path = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav
      className={cn(
        "mb-6 flex flex-nowrap gap-1 overflow-x-auto border-b border-border scroll-px-3 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="Section pages"
    >
      {items.map((item) => {
        const active = path === item.href || path.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex min-h-11 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors touch-manipulation active:opacity-80",
              active
                ? "text-blue-600"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {item.badge ? (
              <span
                className={cn(
                  "rounded px-1 text-sm font-bold uppercase",
                  item.badge === "NEW" ? "bg-primary/20 text-primary" : "bg-blue-600/20 text-blue-600",
                )}
              >
                {item.badge}
              </span>
            ) : null}
            {active && !reduce ? (
              <motion.span
                layoutId="section-nav-indicator"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-600"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : active ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-blue-600" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
