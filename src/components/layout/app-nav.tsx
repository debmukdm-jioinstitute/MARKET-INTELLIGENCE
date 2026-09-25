"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useMobileNav } from "@/components/layout/mobile-nav-provider";
import { NAV_SECTIONS, START_HERE, findGroup, slug, type NavGroup, type NavSection } from "@/lib/nav-columns";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Briefcase, CalendarDays, ChevronDown, Database, ExternalLink, LayoutDashboard, LineChart, LogOut, Menu, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

type Accent = { text: string; dot: string; hoverBg: string; ring: string };
const ACCENTS: Record<string, Accent> = {
  Today: { text: "text-blue-600", dot: "bg-blue-500", hoverBg: "hover:bg-blue-50", ring: "border-blue-200" },
  Invest: { text: "text-emerald-600", dot: "bg-emerald-500", hoverBg: "hover:bg-emerald-50", ring: "border-emerald-200" },
  Trade: { text: "text-rose-600", dot: "bg-rose-500", hoverBg: "hover:bg-rose-50", ring: "border-rose-200" },
  "My Portfolio": { text: "text-violet-600", dot: "bg-violet-500", hoverBg: "hover:bg-violet-50", ring: "border-violet-200" },
  "Data & Tools": { text: "text-amber-600", dot: "bg-amber-500", hoverBg: "hover:bg-amber-50", ring: "border-amber-200" },
};
const DEFAULT_ACCENT: Accent = { text: "text-blue-600", dot: "bg-blue-500", hoverBg: "hover:bg-blue-50", ring: "border-blue-200" };
const SECTION_ICONS: Record<string, typeof CalendarDays> = {
  Today: CalendarDays,
  Invest: TrendingUp,
  Trade: LineChart,
  "My Portfolio": Briefcase,
  "Data & Tools": Database,
};

/** Old admin-created tabs used the previous five section names; map them onto the new ones. */
const LEGACY_SECTION: Record<string, string> = { markets: "Today", macro: "Invest", research: "Invest", intelligence: "Trade", portfolio: "My Portfolio" };

/** Static sections plus any admin-created tabs from /api/tabs (each becomes its own single-page group). Shared by the desktop bar, the full menu and the bottom bar. */
export function useNavSections(): NavSection[] {
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

  const sections: NavSection[] = NAV_SECTIONS.map((s) => ({ ...s, groups: [...s.groups] }));
  for (const tab of dynamicTabs) {
    const link = { label: tab.label, href: tab.href, desc: "", badge: (tab.badge ?? undefined) as "AI" | "NEW" | undefined, external: tab.external };
    const group: NavGroup = { label: tab.label, desc: "", badge: link.badge, items: [link] };
    const wanted = LEGACY_SECTION[tab.section.toLowerCase()] ?? tab.section;
    const existing = sections.find((c) => c.title.toLowerCase() === wanted.toLowerCase());
    if (existing) existing.groups.push(group);
    else sections.push({ title: tab.section, tagline: "", groups: [group] });
  }
  return sections;
}

function BadgePill({ badge }: { badge?: string }) {
  return badge ? <span className="rounded bg-blue-600/15 px-1.5 py-0.5 text-xs font-bold text-blue-600">{badge}</span> : null;
}

/** One task card: title links to the first page, the pages inside are small links beneath so nothing is hidden. */
function GroupCard({ group, section, activeHref, accent, onNavigate, idPrefix }: { group: NavGroup; section: string; activeHref: string | null; accent: Accent; onNavigate: () => void; idPrefix?: boolean }) {
  const first = group.items[0]!;
  const single = group.items.length === 1;
  const inGroup = group.items.some((i) => i.href === activeHref);
  return (
    <div className={cn("rounded-lg px-3 py-2.5", inGroup ? "bg-accent" : "")}>
      <Link
        id={idPrefix ? `nav-item-${slug(section)}-${slug(group.label)}` : undefined}
        href={first.href}
        target={first.external ? "_blank" : undefined}
        rel={first.external ? "noopener noreferrer" : undefined}
        onClick={onNavigate}
        className={cn("group -mx-1 flex flex-col gap-0.5 rounded-md px-1 py-0.5 transition-colors", accent.hoverBg)}
      >
        <span className={cn("flex items-center gap-1.5 text-sm font-semibold", inGroup ? "text-primary" : "text-gray-900")}>
          {group.label}
          <BadgePill badge={group.badge} />
          {first.external ? <ExternalLink className="size-3 opacity-50" /> : null}
        </span>
        {group.desc ? <span className="text-sm leading-snug text-muted-foreground">{group.desc}</span> : null}
      </Link>
      {!single ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "inline-flex min-h-8 items-center rounded-full border px-2.5 text-sm transition-colors",
                item.href === activeHref ? cn("bg-white font-medium", accent.text, accent.ring) : "border-border bg-white/60 text-gray-700 hover:bg-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Desktop-only hover menu in the TopBar: five sections, each showing 2–4 task cards. */
export function MegaNavBar() {
  const sections = useNavSections();
  const path = usePathname();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = findGroup(sections, path);

  function openCol(i: number) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveIdx(i);
  }
  function scheduleClose() {
    closeTimer.current = setTimeout(() => setActiveIdx(null), 150);
  }
  useEffect(() => {
    const handleOpen = (e: Event) => setActiveIdx((e as CustomEvent).detail);
    const handleClose = () => setActiveIdx(null);
    window.addEventListener("open-nav", handleOpen);
    window.addEventListener("close-nav", handleClose);
    return () => {
      window.removeEventListener("open-nav", handleOpen);
      window.removeEventListener("close-nav", handleClose);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <nav className="relative hidden items-center gap-0.5 lg:flex" onMouseLeave={scheduleClose} aria-label="Main">
      {sections.map((sec, i) => {
        const accent = ACCENTS[sec.title] ?? DEFAULT_ACCENT;
        const active = activeIdx === i;
        const here = current?.section.title === sec.title;
        return (
          <div key={sec.title} className="relative" onMouseEnter={() => openCol(i)}>
            <Link
              id={`nav-${slug(sec.title)}`}
              href={sec.groups[0]?.items[0]?.href ?? "#"}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                active || here ? cn("bg-accent", accent.text) : "text-foreground hover:bg-accent",
              )}
            >
              {sec.title}
              <ChevronDown className={cn("size-3 transition-transform", active && "rotate-180")} />
            </Link>
            <div
              className={cn(
                "absolute left-0 top-full z-50 mt-2 w-[26rem] rounded-xl border border-border bg-white p-2 shadow-[var(--shadow-lg)] transition-all duration-150",
                active ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
              )}
              onMouseEnter={() => openCol(i)}
            >
              {sec.tagline ? <p className="px-3 pb-1 pt-1.5 text-sm text-muted-foreground">{sec.tagline}</p> : null}
              <div className="space-y-0.5">
                {sec.groups.map((g) => (
                  <GroupCard key={g.label} group={g} section={sec.title} activeHref={current?.href ?? null} accent={accent} onNavigate={() => setActiveIdx(null)} idPrefix />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/** Trigger button — lives in the TopBar, opens the full-width nav panel. */
export function AppNavTrigger() {
  const { open, setOpen, openSection } = useMobileNav();
  return (
    <button
      type="button"
      onClick={() => {
        if (open) setOpen(false);
        else {
          openSection(null);
          setOpen(true);
        }
      }}
      aria-expanded={open}
      aria-label="Open navigation"
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
        open ? "border-primary/40 bg-accent text-primary" : "border-border text-foreground hover:bg-accent hover:text-primary",
      )}
    >
      {open ? <X className="size-3.5" /> : <Menu className="size-3.5" />}
      Menu
    </button>
  );
}

/** Phone/tablet bottom tab bar: one tap on a section opens the menu already expanded to it. */
export function BottomTabBar() {
  const sections = useNavSections();
  const path = usePathname();
  const { open, section, openSection } = useMobileNav();
  const current = findGroup(sections, path);
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-[55] grid border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      style={{ gridTemplateColumns: `repeat(${Math.min(sections.length, 5)}, minmax(0, 1fr))` }}
    >
      {sections.slice(0, 5).map((sec) => {
        const Icon = SECTION_ICONS[sec.title] ?? BarChart3;
        const accent = ACCENTS[sec.title] ?? DEFAULT_ACCENT;
        const on = (open && section === sec.title) || (!open && current?.section.title === sec.title);
        return (
          <button
            key={sec.title}
            type="button"
            onClick={() => (open && section === sec.title ? openSection(null) : openSection(sec.title))}
            aria-current={on ? "page" : undefined}
            className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium transition-colors", on ? accent.text : "text-muted-foreground")}
          >
            <Icon className="size-5" />
            <span className="max-w-full truncate">{sec.title === "My Portfolio" ? "Portfolio" : sec.title === "Data & Tools" ? "Tools" : sec.title}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Full menu: beginner shortcuts on top, then an accordion of sections (phone/tablet) or a five-column grid (desktop). */
export function AppNav() {
  const { open, setOpen, section, openSection } = useMobileNav();
  const path = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const sections = useNavSections();
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined);
  const current = findGroup(sections, path);

  const openTitle = expanded === undefined ? (section ?? current?.section.title ?? null) : expanded;

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

  const close = () => {
    setExpanded(undefined);
    openSection(null);
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
            onClick={close}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed inset-x-0 top-0 z-[61] flex max-h-[100dvh] flex-col overflow-hidden border-b border-border bg-white shadow-[var(--shadow-lg)] max-lg:bottom-14 max-lg:max-h-none"
          >
            <div className="mx-auto flex h-14 w-full max-w-7xl shrink-0 items-center justify-between px-4 sm:px-6">
              <Link href="/Home" onClick={close} className="flex items-center gap-2.5">
                <img src="/logo.png" alt="Market Intelligence" className="h-7 w-auto dark:invert" />
              </Link>
              <button type="button" onClick={close} aria-label="Close navigation" className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                {section === null ? (
                  <>
                <p className="mb-2 text-sm font-semibold text-gray-900">New here? Pick what fits you</p>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {START_HERE.map((s) => (
                    <Link key={s.href} href={s.href} onClick={close} className="flex min-h-14 flex-col justify-center rounded-xl border border-border bg-gray-50 px-3 py-2 transition-colors hover:bg-accent">
                      <span className="text-sm text-muted-foreground">{s.label}</span>
                      <span className="text-sm font-semibold text-primary">{s.cta} →</span>
                    </Link>
                  ))}
                </div>
                  </>
                ) : null}
                <Link
                  href="/Home"
                  onClick={close}
                  className={cn("mt-3 flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors", path === "/Home" ? "border-primary/30 bg-accent text-primary" : "border-border text-foreground hover:bg-muted")}
                >
                  <LayoutDashboard className="size-4" />
                  {path === "/Home" ? "Home" : "Back to Home"}
                </Link>
              </div>

              {/* Phone + tablet: accordion, one section open at a time */}
              <div className="mx-auto mt-4 max-w-7xl space-y-2 px-4 sm:px-6 lg:hidden">
                {sections.map((sec) => {
                  const accent = ACCENTS[sec.title] ?? DEFAULT_ACCENT;
                  const isOpen = openTitle === sec.title;
                  return (
                    <div key={sec.title} className="rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : sec.title)}
                        aria-expanded={isOpen}
                        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
                      >
                        <span>
                          <span className={cn("flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider", accent.text)}>
                            <span className={cn("size-1.5 rounded-full", accent.dot)} />
                            {sec.title}
                          </span>
                          {sec.tagline ? <span className="block text-sm text-muted-foreground">{sec.tagline}</span> : null}
                        </span>
                        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                      </button>
                      {isOpen ? (
                        <div className="grid gap-1 border-t border-border p-2 sm:grid-cols-2">
                          {sec.groups.map((g) => (
                            <GroupCard key={g.label} group={g} section={sec.title} activeHref={current?.href ?? null} accent={accent} onNavigate={close} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Desktop: five columns */}
              <div className="mx-auto mt-6 hidden max-w-7xl grid-cols-5 gap-x-4 border-t border-border px-6 pt-6 lg:grid">
                {sections.map((sec) => {
                  const accent = ACCENTS[sec.title] ?? DEFAULT_ACCENT;
                  return (
                    <div key={sec.title}>
                      <p className={cn("mb-1 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider", accent.text)}>
                        <span className={cn("size-1.5 rounded-full", accent.dot)} />
                        {sec.title}
                      </p>
                      {sec.tagline ? <p className="mb-2 text-sm text-muted-foreground">{sec.tagline}</p> : null}
                      <div className="space-y-1">
                        {sec.groups.map((g) => (
                          <GroupCard key={g.label} group={g} section={sec.title} activeHref={current?.href ?? null} accent={accent} onNavigate={close} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-7xl shrink-0 items-center justify-end border-t border-border px-4 py-2 sm:px-6">
              <button
                type="button"
                onClick={async () => {
                  close();
                  await logout();
                  router.replace("/");
                }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
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
