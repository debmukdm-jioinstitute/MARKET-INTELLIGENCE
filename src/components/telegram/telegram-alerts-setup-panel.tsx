"use client";

import Image from "next/image";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Flame,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export const TELEGRAM_BOT_URL = "https://t.me/MarketIntelRadarBot?start=quick_connect";

const ALERT_CHANNELS = [
  {
    key: "breaking" as const,
    title: "Breaking Catalysts",
    desc: "Index moves >0.75%, circulars, rate decisions",
  },
  {
    key: "options" as const,
    title: "Options & Blocks",
    desc: "Unusual OI shifts & institutional deals",
  },
  {
    key: "morningBrief" as const,
    title: "Morning Brief (8:45 AM)",
    desc: "Global disparity, crude, currency pre-open",
  },
  {
    key: "eveningRecap" as const,
    title: "Evening Recap (4:15 PM)",
    desc: "FII/DII net flows & sector rotation",
  },
];

type AlertKey = (typeof ALERT_CHANNELS)[number]["key"];

const STORAGE_KEY = "mi.telegram.alertChannels.v1";

function loadChannelPrefs(): Record<AlertKey, boolean> {
  if (typeof window === "undefined") {
    return { breaking: true, options: true, morningBrief: true, eveningRecap: true };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { breaking: true, options: true, morningBrief: true, eveningRecap: true };
    const parsed = JSON.parse(raw) as Partial<Record<AlertKey, boolean>>;
    return {
      breaking: parsed.breaking ?? true,
      options: parsed.options ?? true,
      morningBrief: parsed.morningBrief ?? true,
      eveningRecap: parsed.eveningRecap ?? true,
    };
  } catch {
    return { breaking: true, options: true, morningBrief: true, eveningRecap: true };
  }
}

export function TelegramAlertsSetupPanel({
  compact,
  onHelpClick,
}: {
  compact?: boolean;
  onHelpClick?: () => void;
}) {
  const [activeAlerts, setActiveAlerts] = useState<Record<AlertKey, boolean>>({
    breaking: true,
    options: true,
    morningBrief: true,
    eveningRecap: true,
  });
  const [previewTick, setPreviewTick] = useState(0);
  const [sampleFlash, setSampleFlash] = useState(false);

  useEffect(() => {
    setActiveAlerts(loadChannelPrefs());
  }, []);

  const toggleChannel = useCallback((key: AlertKey) => {
    setActiveAlerts((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const sendSampleAlert = useCallback(() => {
    setPreviewTick((t) => t + 1);
    setSampleFlash(true);
    window.setTimeout(() => setSampleFlash(false), 2200);
  }, []);

  return (
    <div className={cn("space-y-6", compact ? "space-y-5" : "space-y-6")}>
      {/* Activation */}
      <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/[0.08] via-card to-card p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-600 uppercase tracking-wider">
              <Radio className="size-3.5 shrink-0 text-sky-500" aria-hidden />
              Instant activation link
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">Connect @MarketIntelRadarBot</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
              Zero token configuration required. Tap the button below, press <span className="font-semibold text-foreground">START</span>
              , and notifications activate immediately.
            </p>
          </div>

          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full sm:w-auto sm:self-start items-center justify-center gap-2 rounded-xl bg-[#229ED9] hover:bg-[#1a8bc4] text-white font-semibold text-sm px-5 py-3.5 shadow-md shadow-sky-500/20 transition-transform hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            <Send className="size-4 shrink-0" aria-hidden />
            Open in Telegram
            <ExternalLink className="size-3.5 opacity-80 shrink-0" aria-hidden />
          </a>
        </div>

        <ol className="mt-4 grid gap-2 sm:grid-cols-3 sm:gap-3 pt-4 border-t border-border/60">
          {[
            "Click “Open in Telegram”",
            <>Tap <span className="font-semibold text-foreground">/start</span> in the bot chat</>,
            "Live alerts streamed 24/7",
          ].map((label, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-muted-foreground">
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-[11px] font-bold text-sky-700 tabular-nums"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="pt-0.5 leading-snug">{label}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="size-3.5 text-amber-500" aria-hidden />
            Live Telegram message preview
          </span>
          <button
            type="button"
            onClick={sendSampleAlert}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 px-3 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Sparkles className="size-3.5" aria-hidden />
            Send sample alert
          </button>
        </div>

        {sampleFlash ? (
          <p role="status" className="text-xs font-medium text-emerald-600 animate-in fade-in duration-300">
            Sample delivered — this is what hits your Telegram chat.
          </p>
        ) : null}

        <div
          key={previewTick}
          className={cn(
            "rounded-2xl border border-sky-500/15 bg-[#eef6fc] dark:bg-sky-950/30 p-4 sm:p-5 space-y-3 shadow-inner",
            previewTick > 0 && "animate-in fade-in slide-in-from-bottom-2 duration-500",
          )}
        >
          <div className="flex items-center justify-between gap-2 text-xs border-b border-sky-900/10 dark:border-sky-500/20 pb-2.5">
            <div className="flex items-center gap-2 font-semibold text-foreground min-w-0">
              <Image src="/integrations/telegram-logo.png" alt="" width={18} height={18} className="shrink-0 object-contain" />
              <span className="truncate">Market Intelligence Radar</span>
              <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                BOT
              </span>
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">Just now</span>
          </div>

          <div className="space-y-2 text-[13px] leading-relaxed">
            <p className="flex items-center gap-1.5 font-bold text-rose-600">
              <Flame className="size-4 shrink-0 text-rose-500" aria-hidden />
              BREAKING: Bearish Contagion &amp; Energy Surge
            </p>
            <ul className="space-y-1 text-foreground">
              <li>
                <span className="font-semibold">NIFTY 50</span>: 24,845.20 (
                <span className="font-semibold text-rose-600">-0.88%</span> · -221 pts)
              </li>
              <li>
                <span className="font-semibold">Brent Crude</span>: $101.32 (
                <span className="font-semibold text-rose-600">+3.36%</span> surge above $100)
              </li>
              <li>
                <span className="font-semibold">Market Breadth</span>: 74% declines (1,962 vs 676 advances)
              </li>
              <li>
                <span className="font-semibold">India VIX</span>: 14.22 (
                <span className="font-semibold text-rose-600">+7.19%</span> structural risk spike)
              </li>
            </ul>
            <p className="text-xs text-muted-foreground pt-1 border-t border-sky-900/5 dark:border-sky-500/15">
              Synthesized regime: High energy input drag across Auto/OMC sectors.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center rounded-md border border-sky-500/30 bg-white/80 dark:bg-card/80 px-2.5 py-1.5 text-[11px] font-semibold text-sky-800 dark:text-sky-200 shadow-sm">
              View Deep Research
            </span>
            <span className="inline-flex items-center rounded-md border border-border bg-white/60 dark:bg-card/60 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
              Open in Claude Desk
            </span>
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Configured alert channels
          <span className="font-normal normal-case tracking-normal text-muted-foreground/80"> — tap to toggle (saved on this device)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ALERT_CHANNELS.map((item) => {
            const on = activeAlerts[item.key];
            return (
              <button
                key={item.key}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => toggleChannel(item.key)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
                  on
                    ? "border-sky-500/35 bg-sky-500/[0.06] shadow-sm"
                    : "border-border/70 bg-muted/20 opacity-75 hover:opacity-100",
                )}
              >
                <div className="flex items-start gap-2.5">
                  {on ? (
                    <CheckCircle2 className="size-5 shrink-0 text-sky-500 mt-0.5" aria-hidden />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted-foreground/40 mt-0.5" aria-hidden />
                  )}
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground border-t border-border pt-4">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-hidden />
          Official bot webhook · No spam · Free with account
        </span>
        {onHelpClick ? (
          <button type="button" onClick={onHelpClick} className="text-sky-600 hover:underline font-semibold text-left">
            Advanced setup →
          </button>
        ) : (
          <Link href="/help#telegram" className="text-sky-600 hover:underline font-semibold">
            Advanced setup →
          </Link>
        )}
      </div>
    </div>
  );
}
