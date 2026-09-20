"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  FlaskConical,
  Gauge,
  Globe2,
  IndianRupee,
  LayoutDashboard,
  LineChart,
  LogOut,
  Monitor,
  PieChart,
  Rocket,
  Shield,
  SlidersHorizontal,
  FileText,
  Rss,
  Sigma,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app", label: "Command", icon: Monitor },
  { href: "/portfolio", label: "Portfolios", icon: Briefcase },
  { href: "/research", label: "Research", icon: BookOpen },
  { href: "/allocation", label: "Allocation", icon: PieChart },
  { href: "/risk", label: "Risk", icon: Shield },
  { href: "/attribution", label: "Attribution", icon: Activity },
  { href: "/quant", label: "Quant", icon: FlaskConical },
  { href: "/macro", label: "Macro", icon: Globe2 },
  { href: "/markets", label: "Markets", icon: LineChart },
  { href: "/india-markets", label: "India Markets", icon: IndianRupee },
  { href: "/derivatives", label: "Derivatives", icon: Sigma },
  { href: "/ipo", label: "IPOs", icon: Rocket },
  { href: "/feeds", label: "Data feeds", icon: Rss },
  { href: "/scenarios", label: "Scenarios", icon: Gauge },
  { href: "/optimizer", label: "Optimizer", icon: SlidersHorizontal },
  { href: "/backtest", label: "Backtest", icon: BarChart3 },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function Sidebar() {
  const path = usePathname();
  const { user, isGuest, logout } = useAuth();
  const router = useRouter();

  return (
    <aside className="flex h-screen w-[232px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="border-b border-border px-5 py-5">
        <p className="font-[Tiny5] text-[11px] tracking-[0.18em] text-primary">MI TERMINAL</p>
        <h1 className="mt-1 font-heading text-lg font-semibold tracking-tight">Market Intelligence</h1>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          {isGuest ? "Guest explorer" : user?.name ?? "Virtual portfolio management"}
        </p>
        {isGuest ? (
          <Link
            href="/signup"
            className="mt-2 inline-block text-[10px] font-medium text-primary hover:underline"
          >
            Save desk → sign up
          </Link>
        ) : null}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? path === "/dashboard"
              : item.href === "/app"
                ? path === "/app"
                : path.startsWith(item.href);
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
      <button
        type="button"
        className="flex items-center gap-2 border-t border-border px-4 py-3 text-left text-[11px] text-muted-foreground hover:text-foreground"
        onClick={async () => {
          await logout();
          router.replace("/");
        }}
      >
        <LogOut className="size-3.5" />
        Sign out
      </button>
    </aside>
  );
}
