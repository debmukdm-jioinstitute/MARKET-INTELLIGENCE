"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useMobileNav } from "@/components/layout/mobile-nav-provider";
import { usePortalPages } from "@/components/providers/portal-page-provider";
import {
  NAV_SECTIONS,
  START_HERE,
  findGroup,
  sectionLandingHref,
  slug,
  type NavGroup,
  type NavLink,
  type NavSection,
} from "@/lib/nav-columns";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Briefcase, Bug, UserRound, CalendarDays, ChevronDown, Database, ExternalLink, Globe, LayoutDashboard, LineChart, LogOut, Menu, MoreHorizontal, Search, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  Stocks: { text: "text-emerald-600", dot: "bg-emerald-500", hoverBg: "hover:bg-emerald-50", ring: "border-emerald-200" },
  Trade: { text: "text-rose-600", dot: "bg-rose-500", hoverBg: "hover:bg-rose-50", ring: "border-rose-200" },
  "Macro & Flows": { text: "text-cyan-600", dot: "bg-cyan-500", hoverBg: "hover:bg-cyan-50", ring: "border-cyan-200" },
  Portfolio: { text: "text-violet-600", dot: "bg-violet-500", hoverBg: "hover:bg-violet-50", ring: "border-violet-200" },
  "Data & Tools": { text: "text-amber-600", dot: "bg-amber-500", hoverBg: "hover:bg-amber-50", ring: "border-amber-200" },
  Profile: { text: "text-indigo-600", dot: "bg-indigo-500", hoverBg: "hover:bg-indigo-50", ring: "border-indigo-200" },
};
const DEFAULT_ACCENT: Accent = { text: "text-blue-600", dot: "bg-blue-500", hoverBg: "hover:bg-blue-50", ring: "border-blue-200" };
const SECTION_ICONS: Record<string, typeof CalendarDays> = {
  Today: CalendarDays,
  Stocks: TrendingUp,
  Trade: LineChart,
  "Macro & Flows": Globe,
  Portfolio: Briefcase,
  "Data & Tools": Database,
};

/** Old admin-created tabs used earlier section names; map them onto the current ones. */
const LEGACY_SECTION: Record<string, string> = { markets: "Today", macro: "Macro & Flows", research: "Stocks", intelligence: "Trade", portfolio: "Portfolio", invest: "Stocks", "my portfolio": "Portfolio" };

function filterNavItems(items: NavLink[], hrefAllowed: (href: string) => boolean): NavLink[] {
  return items.filter((i) => i.external || hrefAllowed(i.href));
}

function filterSections(sections: NavSection[], hrefAllowed: (href: string) => boolean): NavSection[] {
  return sections
    .map((s) => ({
      ...s,
      groups: s.groups
        .map((g) => ({ ...g, items: filterNavItems(g.items, hrefAllowed) }))
        .filter((g) => g.items.length > 0),
    }))
    .filter((s) => s.groups.length > 0);
}

// One shared /api/tabs request for every useNavSections() caller (was 4 identical requests).
let dynamicTabsCache: { at: number; promise: Promise<DynamicTab[]> } | null = null;
const DYNAMIC_TABS_TTL_MS = 60_000;

function loadDynamicTabs(): Promise<DynamicTab[]> {
  if (dynamicTabsCache && Date.now() - dynamicTabsCache.at < DYNAMIC_TABS_TTL_MS) {
    return dynamicTabsCache.promise;
  }
  const promise = fetch("/api/tabs")
    .then((r) => r.json())
    .then((json: { tabs?: DynamicTab[] }) => json.tabs ?? [])
    .catch(() => {
      dynamicTabsCache = null;
      return [] as DynamicTab[];
    });
  dynamicTabsCache = { at: Date.now(), promise };
  return promise;
}

/** Static sections plus any admin-created tabs from /api/tabs (each becomes its own single-page group). Shared by the desktop bar, the full menu and the bottom bar. */
export function useNavSections(): NavSection[] {
  const { hrefAllowed } = usePortalPages();
  const [dynamicTabs, setDynamicTabs] = useState<DynamicTab[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadDynamicTabs().then((tabs) => {
      if (!cancelled) setDynamicTabs(tabs);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const sections: NavSection[] = NAV_SECTIONS.map((s) => ({ ...s, groups: [...s.groups] }));
    for (const tab of dynamicTabs) {
      const link = { label: tab.label, href: tab.href, desc: "", badge: (tab.badge ?? undefined) as "AI" | "NEW" | undefined, external: tab.external };
      const group: NavGroup = { label: tab.label, desc: "", badge: link.badge, items: [link] };
      const wanted = LEGACY_SECTION[tab.section.toLowerCase()] ?? tab.section;
      const existing = sections.find((c) => c.title.toLowerCase() === wanted.toLowerCase());
      if (existing) existing.groups.push(group);
      else sections.push({ title: tab.section, tagline: "", groups: [group] });
    }
    return filterSections(sections, hrefAllowed);
  }, [dynamicTabs, hrefAllowed]);
}

export function useStartHereLinks() {
  const { hrefAllowed } = usePortalPages();
  return START_HERE.filter((s) => hrefAllowed(s.href));
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
    <div className={cn("flex h-full flex-col rounded-lg px-3 py-2.5", inGroup ? "bg-accent" : "")}>
      <Link
        id={idPrefix ? `nav-item-${slug(section)}-${slug(group.label)}` : undefined}
        href={first.href}
        target={first.external ? "_blank" : undefined}
        rel={first.external ? "noopener noreferrer" : undefined}
        onClick={onNavigate}
        className={cn("group -mx-1 flex flex-col gap-0.5 rounded-md px-1 py-0.5 transition-colors", accent.hoverBg)}
      >
        <span className={cn("flex items-center gap-1.5 text-sm font-semibold", inGroup ? "text-primary" : "text-foreground")}>
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

function megaGridClass(groupCount: number): string {
  if (groupCount <= 2) return "grid-cols-1 sm:grid-cols-2";
  if (groupCount <= 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
  return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";
}

/** Desktop-only hover menu in the TopBar: six sections, each showing task cards in a wide grid when many groups. */
export function MegaNavBar() {
  const sections = useNavSections();
  const path = usePathname();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = findGroup(sections, path);
  const activeSection = activeIdx !== null ? sections[activeIdx] : null;

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
    <div className="relative hidden lg:block" onMouseLeave={scheduleClose}>
      <nav className="flex items-center gap-0.5" aria-label="Main">
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
            </div>
          );
        })}
      </nav>

      <div
        className={cn(
          "fixed inset-x-0 top-14 z-50 border-b border-border bg-white shadow-[var(--shadow-lg)] transition-all duration-150",
          activeSection ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0",
        )}
        onMouseEnter={() => activeIdx !== null && openCol(activeIdx)}
      >
        {activeSection ? (
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            {activeSection.tagline ? (
              <p className="mb-3 text-sm text-muted-foreground">{activeSection.tagline}</p>
            ) : null}
            <div className={cn("grid gap-2 sm:gap-3", megaGridClass(activeSection.groups.length))}>
              {activeSection.groups.map((g) => (
                <GroupCard
                  key={g.label}
                  group={g}
                  section={activeSection.title}
                  activeHref={current?.href ?? null}
                  accent={ACCENTS[activeSection.title] ?? DEFAULT_ACCENT}
                  onNavigate={() => setActiveIdx(null)}
                  idPrefix
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
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
      id="nav-menu-trigger"
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

/** Sections pinned to the phone bottom bar; everything else lives behind "More" (the full menu). */
const BOTTOM_TAB_TITLES = ["Today", "Stocks", "Trade", "Portfolio"];

/** Phone/tablet bottom tab bar (liquid-glass): Today · Stocks · Trade · [Search] · Portfolio · More · Profile. Search sits exactly in the middle as a raised glass button opening the global command palette. */
export function BottomTabBar() {
  const allSections = useNavSections();
  const sections = allSections.filter((s) => BOTTOM_TAB_TITLES.includes(s.title));
  const path = usePathname();
  const { setOpen, openSection } = useMobileNav();
  const { setOpen: setPaletteOpen } = useCommandPalette();
  const { hrefAllowed } = usePortalPages();
  const current = findGroup(sections, path);
  const profileOn = path === "/profile" || path.startsWith("/profile/") || path.startsWith("/profile?");
  const profileAccent = ACCENTS["Profile"] ?? DEFAULT_ACCENT;

  const tabClass = (on: boolean, accent: Accent) =>
    cn(
      "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-medium transition-[color,transform] duration-200 ease-out touch-manipulation active:scale-95",
      on ? accent.text : "text-muted-foreground",
    );

  const renderSectionTab = (sec: NavSection) => {
    const Icon = SECTION_ICONS[sec.title] ?? BarChart3;
    const accent = ACCENTS[sec.title] ?? DEFAULT_ACCENT;
    const landing = sectionLandingHref(sec, hrefAllowed);
    const on =
      current?.section.title === sec.title ||
      path === landing ||
      (landing.length > 1 && path.startsWith(`${landing}/`));
    return (
      <Link
        key={sec.title}
        id={`nav-bottom-${slug(sec.title)}`}
        href={landing}
        onClick={() => {
          openSection(null);
          setOpen(false);
        }}
        aria-current={on ? "page" : undefined}
        className={tabClass(on, accent)}
      >
        {on ? (
          <motion.span
            layoutId="bottom-tab-glass-pill"
            className={cn("absolute inset-x-1 top-1 bottom-1 rounded-2xl", accent.dot, "opacity-15")}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          />
        ) : null}
        <Icon className={cn("relative size-5 transition-transform duration-200", on && "scale-110")} />
        <span className="relative max-w-full truncate">{sec.title}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-3 bottom-[calc(0.625rem+env(safe-area-inset-bottom,0px))] z-[55] lg:hidden"
    >
      <div
        className={cn(
          "relative grid grid-cols-7 overflow-visible rounded-[1.75rem] border px-1 py-1",
          "border-white/50 bg-white/60 shadow-[0_16px_44px_-12px_rgba(30,64,175,0.35),0_2px_10px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.8)]",
          "backdrop-blur-2xl backdrop-saturate-150",
          "dark:border-white/10 dark:bg-zinc-950/55 dark:shadow-[0_16px_44px_-12px_rgba(0,0,0,0.8),0_2px_10px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.12)]",
        )}
      >
        {/* Liquid-glass top sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/25"
        />
        {sections.slice(0, 3).map(renderSectionTab)}

        {/* Center search — raised liquid-glass button, opens the global palette */}
        <div className="relative flex items-start justify-center">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="relative -mt-5"
          >
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-indigo-400/40 blur-md"
              animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.15, 0.5] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <button
              type="button"
              id="nav-bottom-search"
              aria-label="Search stocks, pages and more"
              onClick={() => setPaletteOpen(true)}
              className={cn(
                "relative flex size-14 items-center justify-center rounded-full text-white touch-manipulation",
                "bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600",
                "shadow-[0_10px_24px_-6px_rgba(59,90,246,0.65),inset_0_1px_1px_rgba(255,255,255,0.5),inset_0_-2px_6px_rgba(0,0,0,0.25)]",
                "ring-4 ring-white/70 dark:ring-zinc-950/70",
                "transition-transform duration-150 active:scale-90",
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/35 via-transparent to-transparent"
              />
              <Search className="relative size-6" strokeWidth={2.25} />
            </button>
          </motion.div>
        </div>

        {sections.slice(3).map(renderSectionTab)}

        <button
          type="button"
          id="nav-bottom-more"
          onClick={() => {
            openSection(null);
            setOpen(true);
          }}
          className={tabClass(false, DEFAULT_ACCENT)}
        >
          <MoreHorizontal className="relative size-5" />
          <span className="relative max-w-full truncate">More</span>
        </button>

        <Link
          id="nav-bottom-profile"
          href="/profile"
          onClick={() => {
            openSection(null);
            setOpen(false);
          }}
          aria-current={profileOn ? "page" : undefined}
          className={tabClass(profileOn, profileAccent)}
        >
          {profileOn ? (
            <motion.span
              layoutId="bottom-tab-glass-pill"
              className={cn("absolute inset-x-1 top-1 bottom-1 rounded-2xl", profileAccent.dot, "opacity-15")}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            />
          ) : null}
          <UserRound className={cn("relative size-5 transition-transform duration-200", profileOn && "scale-110")} />
          <span className="relative max-w-full truncate">Profile</span>
        </Link>
      </div>
    </nav>
  );
}

/** Full menu: beginner shortcuts on top, then an accordion of sections (phone/tablet) or a column grid (desktop). */
export function AppNav() {
  const { open, setOpen, section, openSection } = useMobileNav();
  const path = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const sections = useNavSections();
  const startHere = useStartHereLinks();
  const [expanded, setExpanded] = useState<string | null | undefined>(undefined);
  const current = findGroup(sections, path);

  const openTitle = expanded === undefined ? (section ?? current?.section.title ?? null) : expanded;

  useEffect(() => {
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    if (!open) {
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
      return;
    }
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
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
            className="fixed inset-x-0 top-0 z-[61] flex max-h-[100dvh] flex-col overflow-hidden border-b border-border bg-background dark:bg-card shadow-[var(--shadow-lg)] max-lg:bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] max-lg:max-h-none"
          >
            <div className="mx-auto flex h-14 w-full max-w-7xl shrink-0 items-center justify-between px-4 sm:px-6">
              <BrandLogo size="sm" href="/Home" priority className="gap-2.5" onClick={close} />
              <button type="button" onClick={close} aria-label="Close navigation" className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                {section === null ? (
                  <>
                <p className="mb-2 text-sm font-semibold text-foreground">New here? Pick what fits you</p>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                  {startHere.map((s) => (
                    <Link key={s.href} href={s.href} onClick={close} className="flex min-h-14 flex-col justify-center rounded-xl border border-border bg-muted/50 dark:bg-muted/30 px-3 py-2 transition-[colors,transform] duration-200 touch-manipulation active:scale-[0.98] hover:bg-accent">
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
                        <div
                          className={cn(
                            "grid gap-2 border-t border-border p-2",
                            megaGridClass(sec.groups.length),
                          )}
                        >
                          {sec.groups.map((g) => (
                            <GroupCard key={g.label} group={g} section={sec.title} activeHref={current?.href ?? null} accent={accent} onNavigate={close} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Desktop: columns — each section uses a horizontal grid when expanded in menu */}
              <div className="mx-auto mt-6 hidden max-w-7xl border-t border-border px-6 pt-6 lg:block">
                <div className="grid grid-cols-5 gap-x-4">
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
            </div>

            <div className="mx-auto flex w-full max-w-7xl shrink-0 flex-wrap items-center justify-end gap-1 border-t border-border px-4 py-2 sm:px-6">
              <Link
                href="/profile"
                onClick={close}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <UserRound className="size-3.5" />
                My profile
              </Link>
              <Link
                href={`/profile?from=${encodeURIComponent(path ?? "")}#report`}
                onClick={close}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                <Bug className="size-3.5" />
                Report a bug
              </Link>
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
