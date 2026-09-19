"use client";

import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  FlaskConical,
  Gauge,
  Globe2,
  LayoutDashboard,
  LineChart,
  PieChart,
  Shield,
  SlidersHorizontal,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Command", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolios", icon: Briefcase },
  { href: "/research", label: "Research", icon: BookOpen },
  { href: "/allocation", label: "Allocation", icon: PieChart },
  { href: "/risk", label: "Risk", icon: Shield },
  { href: "/attribution", label: "Attribution", icon: Activity },
  { href: "/quant", label: "Quant", icon: FlaskConical },
  { href: "/macro", label: "Macro", icon: Globe2 },
  { href: "/markets", label: "Markets", icon: LineChart },
  { href: "/scenarios", label: "Scenarios", icon: Gauge },
  { href: "/optimizer", label: "Optimizer", icon: SlidersHorizontal },
  { href: "/backtest", label: "Backtest", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex h-screen w-[232px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border px-5 py-5">
        <p className="font-mono text-[10px] tracking-[0.28em] text-primary">MI TERMINAL</p>
        <h1 className="mt-1 font-heading text-lg font-semibold tracking-tight">Market Intelligence</h1>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          Virtual portfolio management
        </p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
                active
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 opacity-80" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border px-4 py-3 font-mono text-[10px] text-muted-foreground">
        SESSION  ·  USD  ·  LIVE SIM
      </div>
    </aside>
  );
}
