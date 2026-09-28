"use client";

import { buildSitemapSections } from "@/lib/nav-columns";
import { cn } from "@/lib/utils";
import Link from "next/link";

const LEGAL = [
  { label: "Help & MCP", href: "/help" },
  { label: "Methodology & data sources", href: "/methodology" },
  { label: "AI methodology", href: "/methodology#ai" },
  { label: "Report a data issue", href: "/methodology#corrections" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

type SiteFooterProps = {
  /** Marketing landing uses glass styling; portal uses default theme tokens. */
  variant?: "portal" | "marketing";
  className?: string;
};

export function SiteFooter({ variant = "portal", className }: SiteFooterProps) {
  const sections = buildSitemapSections();
  const marketing = variant === "marketing";

  return (
    <footer
      className={cn(
        marketing
          ? "border-t border-white/60 bg-white/40 px-5 py-10 backdrop-blur-xl"
          : "border-t border-border bg-muted/30 px-3 py-8 sm:px-4 md:px-5",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl">
        <p
          className={cn(
            "text-sm font-semibold uppercase tracking-widest",
            marketing ? "text-gray-400" : "text-muted-foreground",
          )}
        >
          Sitemap
        </p>
        <div className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p
                className={cn(
                  "text-sm font-semibold",
                  marketing ? "text-gray-700" : "text-foreground",
                )}
              >
                {section.title}
              </p>
              <ul className="mt-2 space-y-1.5">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.href}`}>
                    <Link
                      href={link.href}
                      className={cn(
                        "text-sm transition hover:underline",
                        marketing ? "text-gray-500 hover:text-gray-900" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className={cn("mt-8 max-w-3xl text-xs leading-5", marketing ? "text-gray-500" : "text-muted-foreground")}>
          Market Intelligence provides descriptive data and analytics for information and education only. It is not
          investment advice or an offer to buy or sell any security. Quotes may be delayed and can contain errors;
          verify with your broker or the exchange before acting. Guest and demo portfolios are simulated.
        </p>
        <div
          className={cn(
            "mt-6 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
            marketing ? "border-white/60" : "border-border",
          )}
        >
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {LEGAL.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm transition hover:underline",
                  marketing ? "text-gray-500 hover:text-gray-900" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <p className={cn("text-sm tabular-nums", marketing ? "text-gray-400" : "text-muted-foreground")}>
            © {new Date().getFullYear()} Market Intelligence
          </p>
        </div>
      </div>
    </footer>
  );
}
