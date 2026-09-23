"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useMobileNav } from "@/components/layout/mobile-nav-provider";
import { NAV_COLUMNS, type NavColumn } from "@/lib/nav-columns";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, LayoutDashboard, LogOut, Menu, Newspaper, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DynamicTab = {
  id: string;
  label: string;
  href: string;
  icon: string;
  section: string;
  external: boolean;
  badge: string | null;
  sort_order: number;
};

const ACCENTS: Record<string, { text: string; dot: string; hoverBg: string }> = {
  Markets: { text: "text-blue-600", dot: "bg-blue-500", hoverBg: "hover:bg-blue-50" },
  Macro: { text: "text-emerald-600", dot: "bg-emerald-500", hoverBg: "hover:bg-emerald-50" },
  Portfolio: { text: "text-violet-600", dot: "bg-violet-500", hoverBg: "hover:bg-violet-50" },
  Research: { text: "text-amber-600", dot: "bg-amber-500", hoverBg: "hover:bg-amber-50" },
  Intelligence: { text: "text-rose-600", dot: "bg-rose-500", hoverBg: "hover:bg-rose-50" },
};
const DEFAULT_ACCENT = { text: "text-blue-600", dot: "bg-blue-500", hoverBg: "hover:bg-blue-50" };

const panelVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" as const } },
};

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.16 } },
};

/** Trigger button — lives in the TopBar, opens the full-width nav panel. */
export function AppNavTrigger() {
  const { open, setOpen } = useMobileNav();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      aria-label="Open navigation"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
        open
          ? "border-primary/40 bg-accent text-primary"
          : "border-border text-foreground hover:bg-accent hover:text-primary",
      )}
    >
      {open ? <X className="size-3.5" /> : <Menu className="size-3.5" />}
      Menu
    </button>
  );
}

/** Full-width animated mega nav — replaces the old persistent left sidebar. */
export function AppNav() {
  const { open, setOpen } = useMobileNav();
  const path = usePathname();
  const router = useRouter();
  const { user, isGuest, logout } = useAuth();
  const [dynamicTabs, setDynamicTabs] = useState<DynamicTab[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tabs")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setDynamicTabs(json.tabs ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  const columns: NavColumn[] = NAV_COLUMNS.map((c) => ({ ...c, items: [...c.items] }));
  for (const tab of dynamicTabs) {
    const item = { label: tab.label, href: tab.href, desc: "", badge: tab.badge as "AI" | "NEW" | undefined, external: tab.external };
    const existing = columns.find((c) => c.title.toLowerCase() === tab.section.toLowerCase());
    if (existing) existing.items.push(item);
    else columns.push({ title: tab.section, items: [item] });
  }

  // Only the single longest matching href is "active" — otherwise a parent route
  // like /markets would light up alongside a child like /markets/india.
  let bestHref: string | null = null;
  for (const col of columns) {
    for (const item of col.items) {
      if (item.external) continue;
      const matches = path === item.href || path.startsWith(item.href + "/");
      if (matches && (!bestHref || item.href.length > bestHref.length)) bestHref = item.href;
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-x-0 top-0 z-[61] max-h-screen overflow-y-auto border-b border-border bg-white shadow-[var(--shadow-lg)]"
          >
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-2.5">
                <span className="grid size-7 place-items-center rounded-lg bg-blue-600 text-[9px] font-medium text-white">mi</span>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.15em] text-primary">Market Intelligence</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors",
                  path === "/dashboard"
                    ? "border-primary/30 bg-accent text-primary"
                    : "border-border text-foreground hover:bg-muted",
                )}
              >
                <LayoutDashboard className="size-4" />
                Dashboard
              </Link>
            </div>

            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-8 border-t border-border px-4 py-8 sm:grid-cols-3 sm:px-6 lg:grid-cols-5"
            >
              {columns.map((col) => {
                const accent = ACCENTS[col.title] ?? DEFAULT_ACCENT;
                return (
                  <div key={col.title} className="col-span-2 sm:col-span-1">
                    <p className={cn("mb-3 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase", accent.text)}>
                      <span className={cn("size-1.5 rounded-full", accent.dot)} />
                      {col.title}
                    </p>
                    <ul className="space-y-0.5">
                      {col.items.map((item) => {
                        const active = !item.external && item.href === bestHref;
                        return (
                          <motion.li key={item.label} variants={itemVariants}>
                            <Link
                              href={item.href}
                              target={item.external ? "_blank" : undefined}
                              rel={item.external ? "noopener noreferrer" : undefined}
                              onClick={() => setOpen(false)}
                              className={cn(
                                "group -mx-2 flex flex-col gap-0.5 rounded-lg px-2 py-1.5 transition-colors",
                                active ? "bg-accent" : accent.hoverBg,
                              )}
                            >
                              <span className={cn(
                                "flex items-center gap-1.5 text-[13px] font-medium",
                                active ? "text-primary" : "text-gray-900",
                              )}>
                                {item.label}
                                {item.badge ? (
                                  <span className="rounded bg-blue-600/15 px-1 text-[9px] font-bold text-blue-600">{item.badge}</span>
                                ) : item.external ? (
                                  <ExternalLink className="size-3 opacity-50" />
                                ) : null}
                              </span>
                              {item.desc ? (
                                <span className="text-[11.5px] leading-snug text-muted-foreground">{item.desc}</span>
                              ) : null}
                            </Link>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </motion.div>

            <div className="mx-auto flex max-w-7xl items-center justify-between border-t border-border px-4 py-3 sm:px-6">
              <a
                href="https://abhisheksi2o.github.io/Bazaarbrief/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
              >
                <Newspaper className="size-3.5" />
                Daily Brief
                <ExternalLink className="size-3 opacity-50" />
              </a>
              <button
                type="button"
                onClick={async () => {
                  setOpen(false);
                  await logout();
                  router.replace("/");
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <LogOut className="size-3.5" />
                Sign out
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
