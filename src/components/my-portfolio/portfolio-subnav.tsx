"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/portfolio", label: "Overview" },
  { href: "/portfolio/allocation", label: "Allocation" },
  { href: "/portfolio/risk", label: "Risk" },
  { href: "/portfolio/attribution", label: "Attribution" },
  { href: "/portfolio/quant", label: "Quant" },
  { href: "/portfolio/optimizer", label: "Optimizer" },
  { href: "/portfolio/activity", label: "Activity" },
  { href: "/portfolio/tax", label: "Tax" },
  { href: "/portfolio/watchlist", label: "Watchlist" },
] as const;

export function PortfolioSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5 border-b border-border/60 pb-3" aria-label="Portfolio sections">
      {LINKS.map(({ href, label }) => {
        const active = href === "/portfolio" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold transition-colors",
              active
                ? "bg-blue-600 text-white"
                : "bg-secondary/50 text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
