"use client";

import { usePushSubscription } from "@/components/layout/push-notifications-toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EventCategory, SiteEvent } from "@/lib/notify/types";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

const SEEN_KEY = "mi.notif.seen";
const DAY = 24 * 3600_000;

const CATEGORY_LABEL: Record<EventCategory, string> = { market: "Markets", macro: "Macro", scanner: "Scanner", ai: "AI", brief: "Briefs", data: "Site" };
const TABS: { id: "all" | EventCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "market", label: "Markets" },
  { id: "macro", label: "Macro" },
  { id: "scanner", label: "Scanner" },
  { id: "ai", label: "AI" },
];
const dot = { high: "bg-rose-500", medium: "bg-amber-500", info: "bg-blue-500" } as const;

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<{ events: SiteEvent[] }>);

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
  const push = usePushSubscription();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | EventCategory>("all");
  const [seen, setSeen] = useState<number>(() => Date.now() - DAY);

  useEffect(() => {
    try {
      const v = localStorage.getItem(SEEN_KEY);
      // first visit: treat the last 24 hours as unread so a newcomer immediately sees what the bell is for
      if (v) setSeen(new Date(v).getTime());
    } catch {
      /* private mode */
    }
  }, []);

  const events = useMemo(() => data?.events ?? [], [data]);
  const unread = useMemo(() => events.filter((e) => new Date(e.at).getTime() > seen), [events, seen]);
  const hasHigh = unread.some((e) => e.severity === "high");

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setSeen(Date.now());
    try {
      localStorage.setItem(SEEN_KEY, now);
    } catch {
      /* ignore */
    }
  }, []);

  const shown = events.filter((e) => tab === "all" || e.category === tab);
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
          aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
          title="What's changed on the site"
          className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Bell className="size-4" />
          {unread.length ? (
            <span className={cn("absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4 text-white", hasHigh ? "bg-rose-600" : "bg-blue-600")}>
              {unread.length > 99 ? "99+" : unread.length}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(420px,calc(100vw-24px))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">What's changed</p>
            <p className="text-xs text-muted-foreground">Updates across markets, macro, scanners and AI signals</p>
          </div>
          <button type="button" onClick={markAllRead} disabled={!unread.length} className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
            Mark all read
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs", tab === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent")}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="max-h-[min(60vh,480px)] overflow-y-auto">
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
                      <Link href={e.href} onClick={() => setOpen(false)} className={cn("block border-t border-border/50 px-4 py-2.5 hover:bg-accent", isNew && "bg-blue-500/5")}>
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
                              <span className="ml-auto text-primary">View →</span>
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span>Informational only — not investment advice.</span>
          {push.supported ? (
            <button type="button" disabled={push.busy} onClick={push.toggle} className="shrink-0 text-primary hover:underline disabled:opacity-50">
              {push.subscribed ? "Turn off device alerts" : "Get device alerts"}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
