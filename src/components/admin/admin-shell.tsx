"use client";

import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Mail,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/tabs", label: "App Tabs", icon: LayoutList },
  { href: "/admin/updates", label: "App Updates", icon: Megaphone },
  { href: "/admin/notifications", label: "Push Notifications", icon: Bell },
  { href: "/admin/newsletters", label: "Newsletters", icon: Mail },
  { href: "/admin/knowledge-base", label: "Knowledge Base (RAG)", icon: Sparkles },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-black text-neutral-100">
      <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-800">
        <div className="border-b border-neutral-800 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400">Market Intelligence</p>
          <h1 className="mt-0.5 text-sm font-semibold">Admin backend</h1>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-colors",
                  active
                    ? "bg-amber-400/15 font-bold text-amber-400"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100",
                )}
              >
                <Icon className="size-3.5 shrink-0 opacity-80" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-neutral-800 p-3">
          <p className="truncate text-[11px] text-neutral-500">{user.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
