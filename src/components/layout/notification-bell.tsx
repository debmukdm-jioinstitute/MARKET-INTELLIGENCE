"use client";

import { usePushSubscription } from "@/components/layout/push-notifications-toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EventCategory, SiteEvent } from "@/lib/notify/types";
import { cn } from "@/lib/utils";
import { Bell, ChevronLeft, SlidersHorizontal } from "lucide-react";
import { isExternalNotificationHref } from "@/lib/research/notification-href";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";

const SEEN_KEY = "mi.notif.seen";
const MUTE_KEY = "mi.notif.muted";
const DAY = 24 * 3600_000;

const CATEGORY_LABEL: Record<EventCategory, string> = {
  market: "Markets",
  macro: "Macro",
  broker: "Broker Intel",
  promoter: "Promoters",
  credit: "Credit Risk",
  funds: "Mutual Funds",
  scanner: "Scanner",
  ai: "AI & Retail",
  brief: "Briefs",
  data: "Site",
};
const TAB_CATEGORIES: EventCategory[] = [
  "market",
  "macro",
  "broker",
  "promoter",
  "credit",
  "funds",
  "scanner",
  "ai",
];
const TAB_LABEL: Record<string, string> = {
  market: "Markets",
  macro: "Macro",
  broker: "Broker Intel",
  promoter: "Promoters",
  credit: "Credit Risk",
  funds: "Mutual Funds",
  scanner: "Scanner",
  ai: "AI & Retail",
};
const CATEGORY_HELP: Record<EventCategory, { label: string; help: string }> = {
  market: { label: "Markets & Index Flows", help: "Nifty and VIX moves, FII/DII flows, big index swings" },
  macro: { label: "Macro & System Rates", help: "Currency, yields, commodities, RBI liquidity, stress index" },
  broker: { label: "Broker Research & Consensus", help: "Target price hikes/cuts from 11 top brokers, consensus upgrades" },
  promoter: { label: "Promoter & Insider Actions", help: "Major promoter buying/selling, pledge changes, block deals" },
  credit: { label: "Credit & Rating Actions", help: "CRISIL, ICRA, CARE rating upgrades/downgrades and debt watch alerts" },
  funds: { label: "Mutual Fund Accumulation", help: "High-conviction smart money accumulation across domestic AMCs" },
  scanner: { label: "Scanner Setups", help: "Daily stock scans — highs, lows, crossovers, chart patterns" },
  ai: { label: "AI & Retail Signals", help: "Model lean changes, BTST picks, and Reddit sentiment surges" },
  brief: { label: "Daily Briefings", help: "New pre-market and post-close executive briefings" },
  data: { label: "Platform & Feed Updates", help: "Announcements about feed connectivity and data releases" },
};
const ALL_CATEGORIES = Object.keys(CATEGORY_HELP) as EventCategory[];
const dot = { high: "bg-rose-500", medium: "bg-amber-500", info: "bg-blue-500" } as const;

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<{ events: SiteEvent[] }>);

/** Smart (ranked, personalized) event from /api/notifications/smart. */
export interface SmartEvent extends Omit<SiteEvent, "id"> {
  id: number;
  importance: number;
  symbol: string | null;
  why: string;
  source_url: string | null;
  relevance: number;
  rank: number;
  tier: "critical" | "noteworthy" | "info";
}
const smartFetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<{ events: SmartEvent[]; personal: boolean }>);

const tierBadge = { critical: "bg-rose-500/10 text-rose-600", noteworthy: "bg-amber-500/10 text-amber-700", info: "bg-blue-500/10 text-blue-600" } as const;
const tierLabel = { critical: "Critical", noteworthy: "Noteworthy", info: "FYI" } as const;

function recordInteraction(eventId: number, action: "clicked" | "dismissed") {
  fetch("/api/notifications/interactions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, action }),
  }).catch(() => {});
}

function NotificationItemLink({
  href,
  className,
  onNavigate,
  children,
}: {
  href: string;
  className?: string;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  if (isExternalNotificationHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onNavigate}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onNavigate}>
      {children}
    </Link>
  );
}

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / DAY);
  return diff <= 0 ? "Today" : diff === 1 ? "Yesterday" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** Notification centre: every meaningful change in the site's data, with a link to where it is shown. */
export function NotificationBell() {
  const { data } = useSWR("/api/notifications/feed", fetcher, { refreshInterval: 120_000, revalidateOnFocus: true });
  const { data: smart } = useSWR("/api/notifications/smart", smartFetcher, { refreshInterval: 120_000, revalidateOnFocus: true });
  const push = usePushSubscription();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"foryou" | "all" | EventCategory>("foryou");
  const [view, setView] = useState<"feed" | "settings">("feed");
  const [muted, setMuted] = useState<EventCategory[]>([]);
  const [seen, setSeen] = useState<number>(() => Date.now() - DAY);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [whyOpen, setWhyOpen] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const v = localStorage.getItem(SEEN_KEY);
      // first visit: treat the last 24 hours as unread so a newcomer immediately sees what the bell is for
      if (v) setSeen(new Date(v).getTime());
      const m = JSON.parse(localStorage.getItem(MUTE_KEY) ?? "[]");
      if (Array.isArray(m)) setMuted(m.filter((c): c is EventCategory => ALL_CATEGORIES.includes(c)));
    } catch {
      /* private mode */
    }
  }, []);

  // muted categories are hidden from the list and the badge on this device, and (once subscribed) never pushed to it
  const events = useMemo(() => (data?.events ?? []).filter((e) => !muted.includes(e.category)), [data, muted]);
  const smartEvents = useMemo(
    () => (smart?.events ?? []).filter((e) => !dismissed.has(e.id) && !muted.includes(e.category as EventCategory)),
    [smart, dismissed, muted],
  );
  const unread = useMemo(() => events.filter((e) => new Date(e.at).getTime() > seen), [events, seen]);
  const smartUnread = useMemo(
    () => smartEvents.filter((e) => (e.tier === "critical" || e.tier === "noteworthy") && new Date(e.at).getTime() > seen),
    [smartEvents, seen],
  );
  const totalUnread = unread.length + smartUnread.length;
  const hasHigh = unread.some((e) => e.severity === "high") || smartUnread.some((e) => e.tier === "critical");

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setSeen(Date.now());
    try {
      localStorage.setItem(SEEN_KEY, now);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMute = useCallback((c: EventCategory) => {
    setMuted((cur) => {
      const next = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c];
      try {
        localStorage.setItem(MUTE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    setTab("all");
  }, []);

  const dismissSmart = useCallback((id: number) => {
    recordInteraction(id, "dismissed");
    setDismissed((cur) => new Set(cur).add(id));
  }, []);

  const toggleWhy = useCallback((id: number) => {
    setWhyOpen((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // keep the server's copy of this device's mutes in step so broadcast device alerts honour them
  useEffect(() => {
    if (!push.subscribed) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) fetch("/api/notifications/prefs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint, muted }) }).catch(() => {});
      })
      .catch(() => {});
  }, [push.subscribed, muted]);

  const tabs = ["foryou", "all", ...TAB_CATEGORIES.filter((c) => !muted.includes(c))] as ("foryou" | "all" | EventCategory)[];
  const shown = tab === "foryou" ? [] : events.filter((e) => tab === "all" || e.category === tab);
  const groups: { label: string; items: SiteEvent[] }[] = [];
  for (const e of shown) {
    const label = dayLabel(e.at);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(e);
    else groups.push({ label, items: [e] });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={totalUnread ? `Notifications, ${totalUnread} unread` : "Notifications"}
          title="What's changed on the site"
          className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Bell className="size-4" />
          {totalUnread ? (
            <span className={cn("absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4 text-white", hasHigh ? "bg-rose-600" : "bg-blue-600")}>
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(420px,calc(100vw-24px))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          {view === "settings" ? (
            <button type="button" onClick={() => setView("feed")} className="inline-flex items-center gap-1 text-sm font-semibold hover:text-primary">
              <ChevronLeft className="size-4" /> Notification settings
            </button>
          ) : (
            <div>
              <p className="text-sm font-semibold">What's changed</p>
              <p className="text-xs text-muted-foreground">
                {muted.length ? `${muted.length} categor${muted.length === 1 ? "y" : "ies"} muted` : "Live feeds, broker intel, promoters & macro"}
              </p>
            </div>
          )}
          {view === "feed" ? (
            <div className="flex items-center gap-3">
              <button type="button" onClick={markAllRead} disabled={!unread.length} className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
                Mark all read
              </button>
              <button type="button" onClick={() => setView("settings")} aria-label="Notification settings" title="Mute categories" className={cn("rounded-full p-1.5 hover:bg-accent", muted.length ? "text-primary" : "text-muted-foreground")}>
                <SlidersHorizontal className="size-4" />
              </button>
            </div>
          ) : null}
        </div>
        {view === "feed" ? (
          <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
            {tabs.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs", tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent")}>
                {t === "foryou" ? "For you" : t === "all" ? "All" : TAB_LABEL[t]}
              </button>
            ))}
          </div>
        ) : null}
        {view === "settings" ? (
          <div className="max-h-[min(60vh,480px)] overflow-y-auto px-4 py-3">
            <p className="text-xs text-muted-foreground">Choose what you hear about. Muted categories are hidden from this list and the badge, and are not sent to your device as alerts.</p>
            <ul className="mt-3 divide-y divide-border/50">
              {ALL_CATEGORIES.map((c) => {
                const on = !muted.includes(c);
                return (
                  <li key={c} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{CATEGORY_HELP[c].label}</p>
                      <p className="text-xs text-muted-foreground">{CATEGORY_HELP[c].help}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${CATEGORY_HELP[c].label} notifications`}
                      onClick={() => toggleMute(c)}
                      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-blue-600" : "bg-muted-foreground/30")}
                    >
                      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", on ? "left-[18px]" : "left-0.5")} />
                    </button>
                  </li>
                );
              })}
            </ul>
            {push.supported ? (
              <div className="mt-3 rounded-lg border border-border bg-card p-3">
                <p className="text-sm font-medium">Important alerts on this device</p>
                <p className="mt-0.5 text-xs text-muted-foreground">A device notification for major moves only (for example a big index drop or heavy institutional selling), at most a few a day.</p>
                <button type="button" disabled={push.busy} onClick={push.toggle} className={cn("mt-2 rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50", push.subscribed ? "border border-border hover:bg-accent" : "bg-blue-600 text-white")}>
                  {push.subscribed ? "Turn off device alerts" : "Turn on device alerts"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={cn("max-h-[min(60vh,480px)] overflow-y-auto", view === "settings" && "hidden")}>
          {tab === "foryou" ? (
            <>
              {!smart ? <p className="px-4 py-6 text-sm text-muted-foreground">Ranking what matters to you…</p> : null}
              {smart && !smartEvents.length ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  All quiet. We watch every feed and tap you when something that matters to you happens.
                </p>
              ) : null}
              <ul>
                {smartEvents.map((e) => {
                  const isNew = new Date(e.at).getTime() > seen;
                  const showWhy = whyOpen.has(e.id);
                  return (
                    <li key={e.id} className={cn("border-t border-border/50 px-4 py-2.5", isNew && "bg-blue-500/5")}>
                      <div className="flex items-start gap-2.5">
                        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot[e.severity])} />
                        <div className="min-w-0 flex-1">
                          <NotificationItemLink
                            href={e.source_url && isExternalNotificationHref(e.source_url) ? e.source_url : e.href}
                            onNavigate={() => {
                              recordInteraction(e.id, "clicked");
                              setOpen(false);
                            }}
                            className="block hover:underline"
                          >
                            <p className={cn("text-sm leading-snug", isNew ? "font-semibold" : "font-medium")}>{e.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{e.body}</p>
                          </NotificationItemLink>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className={cn("rounded px-1.5 py-0.5 font-semibold", tierBadge[e.tier])}>{tierLabel[e.tier]}</span>
                            <span>{ago(e.at)}</span>
                            <button type="button" onClick={() => toggleWhy(e.id)} className="text-primary hover:underline">
                              {showWhy ? "Hide why" : "Why am I seeing this?"}
                            </button>
                            <button type="button" onClick={() => dismissSmart(e.id)} className="ml-auto hover:text-foreground" title="Not interested">
                              Dismiss
                            </button>
                          </p>
                          {showWhy && e.why ? <p className="mt-1.5 rounded-md bg-accent/60 px-2 py-1.5 text-xs text-muted-foreground">{e.why}</p> : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <>
              {!data ? <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p> : null}
              {data && !shown.length ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing has changed here yet. Significant moves in markets, macro data and scanners will appear as they happen.</p> : null}
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="sticky top-0 bg-popover/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">{g.label}</p>
                  <ul>
                    {g.items.map((e) => {
                      const isNew = new Date(e.at).getTime() > seen;
                      return (
                        <li key={e.id}>
                          <NotificationItemLink
                            href={e.href}
                            onNavigate={() => setOpen(false)}
                            className={cn("block border-t border-border/50 px-4 py-2.5 hover:bg-accent", isNew && "bg-blue-500/5")}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot[e.severity])} />
                              <div className="min-w-0 flex-1">
                                <p className={cn("text-sm leading-snug", isNew ? "font-semibold" : "font-medium")}>{e.title}</p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{e.body}</p>
                                <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span>{CATEGORY_LABEL[e.category]}</span>
                                  <span>·</span>
                                  <span>{ago(e.at)}</span>
                                  {e.severity === "high" ? <span className="rounded bg-rose-500/10 px-1.5 text-rose-600">Important</span> : null}
                                  <span className="ml-auto text-primary">
                                    {isExternalNotificationHref(e.href) ? "Open PDF →" : "View →"}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </NotificationItemLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>Informational only — not investment advice.</span>
          {view === "feed" && push.supported && !push.subscribed ? (
            <button type="button" disabled={push.busy} onClick={push.toggle} className="shrink-0 text-primary hover:underline disabled:opacity-50">
              Get Important alerts
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
