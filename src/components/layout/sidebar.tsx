"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Database,
  Globe2,
  LayoutDashboard,
  LineChart,
  LogOut,
  Radio,
  BookOpen,
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
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "TOP-DOWN",
    items: [
      { href: "/macro", label: "Macro", icon: Globe2 },
      { href: "/markets", label: "Markets", icon: LineChart },
    ],
  },
  {
    title: "BOOK",
    items: [{ href: "/portfolio", label: "Portfolio", icon: Briefcase }],
  },
  {
    title: "BOTTOM-UP",
    items: [{ href: "/research", label: "Research", icon: BookOpen }],
  },
  {
    title: "FEEDS",
    items: [
      { href: "/intelligence", label: "Intelligence", icon: Radio, badge: "AI" },
      { href: "/data", label: "System", icon: Database },
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
                const active = path === item.href || path.startsWith(item.href + "/");
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
