"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Bot,
  BookOpen,
  Briefcase,
  Database,
  Flame,
  Globe2,
  IndianRupee,
  Layers,
  LayoutDashboard,
  LineChart,
  LogOut,
  PieChart,
  Radio,
  Shield,
  Sigma,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavGroup {
  title: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "CORE",
    items: [
      { href: "/dashboard", label: "Dashboard / Home", icon: LayoutDashboard },
    ],
  },
  {
    title: "MARKET",
    items: [
      { href: "/markets", label: "Index & Universe", icon: LineChart },
      { href: "/india-markets", label: "India Equities (NSE)", icon: IndianRupee },
      { href: "/markets/breadth", label: "Breadth", icon: BarChart3 },
      { href: "/derivatives", label: "F&O & Derivatives", icon: Sigma },
      { href: "/markets/momentum", label: "Momentum", icon: Flame },
      { href: "/markets/valuation", label: "Valuation Snapshot", icon: Activity },
    ],
  },
  {
    title: "MACRO",
    items: [
      { href: "/macro", label: "Macro Board", icon: Globe2 },
      { href: "/macro/india", label: "India Macro", icon: IndianRupee },
      { href: "/macro/global", label: "Global Radar", icon: Globe2 },
      { href: "/macro/rbi", label: "RBI & Liquidity", icon: Activity },
      { href: "/macro/calendar", label: "Economic Calendar", icon: BarChart3 },
    ],
  },
  {
    title: "SECTORS",
    items: [
      { href: "/sectors", label: "Sector Intelligence", icon: Layers, badge: "NEW" },
    ],
  },
  {
    title: "PORTFOLIO",
    items: [
      { href: "/portfolio", label: "Command Center", icon: Briefcase },
      { href: "/allocation", label: "Asset Allocation", icon: PieChart },
      { href: "/risk", label: "Risk & VaR", icon: Shield },
      { href: "/attribution", label: "Attribution", icon: Activity },
      { href: "/quant", label: "Quant & Factors", icon: Sigma },
      { href: "/scenarios", label: "Stress Testing", icon: Layers },
      { href: "/optimizer", label: "Optimizer", icon: BarChart3 },
      { href: "/backtest", label: "Backtest Desk", icon: BarChart3 },
    ],
  },
  {
    title: "RESEARCH",
    items: [
      { href: "/research", label: "Company Workbench", icon: BookOpen },
      { href: "/ai-desk", label: "AI Desk", icon: Bot, badge: "AI" },
      { href: "/ipo", label: "IPO Pipeline", icon: Sparkles },
      { href: "/reports", label: "IC Reports", icon: BookOpen },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { href: "/intelligence", label: "News & Events", icon: Radio, badge: "AI" },
    ],
  },
  {
    title: "DATA & HEALTH",
    items: [
      { href: "/data", label: "Sources & Status", icon: Database },
      { href: "/feeds", label: "Raw Feed Hub", icon: Activity },
    ],
  },
];

export function Sidebar() {
  const path = usePathname();
  const { user, isGuest, logout } = useAuth();
  const router = useRouter();

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-border bg-sidebar select-none">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="font-[Tiny5] text-[11px] tracking-[0.2em] text-primary">MI TERMINAL</p>
          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-400">
            PRO
          </span>
        </div>
        <h1 className="mt-1 font-heading text-base font-semibold tracking-tight">Market Intelligence</h1>
        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
          {isGuest ? "Institutional Demo" : user?.name ?? "Investment Desk"}
        </p>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3 scrollbar-none">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-2.5 text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? path === "/dashboard" || path === "/app"
                    : path === item.href || (item.href !== "/portfolio" && item.href !== "/markets" && item.href !== "/macro" && path.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between rounded-md px-2.5 py-1.5 text-[12px] transition-colors",
                      active
                        ? "bg-amber-400/15 text-amber-400 font-bold border-l-2 border-amber-400"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground font-medium",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="size-3.5 shrink-0 opacity-80" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span
                        className={cn(
                          "rounded px-1 text-[9px] font-bold uppercase",
                          item.badge === "NEW"
                            ? "bg-primary/20 text-primary"
                            : "bg-amber-500/20 text-amber-400",
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-2">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[11px] text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors"
          onClick={async () => {
            await logout();
            router.replace("/");
          }}
        >
          <LogOut className="size-3.5" />
          <span>Sign out terminal</span>
        </button>
      </div>
    </aside>
  );
}
