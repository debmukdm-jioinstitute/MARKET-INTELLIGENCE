"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bell,
  CheckCircle2,
  ExternalLink,
  Flame,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TelegramModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DEFAULT_BOT_URL = "https://t.me/MarketIntelRadarBot?start=quick_connect";

export function TelegramOneClickModal({ trigger, open, onOpenChange }: TelegramModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const showModal = isControlled ? open : internalOpen;
  const setShowModal = isControlled ? onOpenChange! : setInternalOpen;

  const [testSent, setTestSent] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState({
    breaking: true,
    options: true,
    morningBrief: true,
    eveningRecap: true,
  });

  const triggerTestAlert = () => {
    setTestSent(true);
  };

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-xl p-0 overflow-hidden border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl rounded-2xl">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="p-6 sm:p-7 relative z-10 space-y-6">
          {/* Header */}
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative size-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 p-2 flex items-center justify-center shadow-inner overflow-hidden">
                  <Image
                    src="/integrations/telegram-logo.png"
                    alt="Telegram Logo"
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                  <span className="absolute bottom-1 right-1 size-2 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                      Telegram Bot Setup
                    </DialogTitle>
                    <span className="rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[11px] font-bold text-sky-600 uppercase tracking-wide">
                      1-Click Connect
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Stream real-time breaking market catalysts, options spikes, and morning briefings.
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Primary 1-Click Action */}
          <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card to-card p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 uppercase tracking-wider">
                  <Radio className="size-3.5 animate-pulse text-sky-500" />
                  Instant Activation Link
                </div>
                <h4 className="text-base font-bold text-foreground">
                  Connect @MarketIntelRadarBot
                </h4>
                <p className="text-xs text-muted-foreground">
                  Zero token configuration required. Tap the button below, press <b>START</b>, and notifications activate immediately.
                </p>
              </div>

              <a
                href={DEFAULT_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm px-5 py-3 shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Send className="size-4" />
                <span>Open in Telegram</span>
                <ExternalLink className="size-3.5 opacity-80" />
              </a>
            </div>

            {/* Quick 3-step checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-sky-500/10 text-sky-600 font-bold flex items-center justify-center shrink-0">1</span>
                <span>Click &ldquo;Open in Telegram&rdquo;</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-sky-500/10 text-sky-600 font-bold flex items-center justify-center shrink-0">2</span>
                <span>Tap <b>/start</b> in the bot chat</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0">3</span>
                <span>Live alerts streamed 24/7</span>
              </div>
            </div>
          </div>

          {/* Interactive Simulation / Test Alert */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="size-3.5 text-amber-500" />
                Live Telegram Message Preview
              </span>
              <button
                type="button"
                onClick={triggerTestAlert}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Sparkles className="size-3" />
                <span>{testSent ? "Trigger Another Test" : "Send Sample Alert"}</span>
              </button>
            </div>

            {/* Glassmorphic Telegram Chat Bubble */}
            <div className="rounded-xl border border-sky-500/20 bg-muted/40 p-4 space-y-2.5 transition-all">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <div className="size-2 rounded-full bg-sky-500" />
                  <span>Market Intelligence Radar</span>
                  <span className="text-[10px] bg-sky-500/10 text-sky-600 px-1.5 py-0.2 rounded font-semibold">BOT</span>
                </div>
                <span className="text-[11px] tabular-nums">Just now</span>
              </div>

              <div className="space-y-1.5 text-xs leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-rose-600">
                  <Flame className="size-3.5 text-rose-500" />
                  <span>BREAKING: Bearish Contagion &amp; Energy Surge</span>
                </div>
                <div className="space-y-0.5 text-foreground font-medium">
                  <p>• <b>NIFTY 50</b>: 24,845.20 (<span className="text-rose-600 font-bold">-0.88%</span> · -221 pts)</p>
                  <p>• <b>Brent Crude</b>: $101.32 (<span className="text-rose-600 font-bold">+3.36%</span> surge above $100)</p>
                  <p>• <b>Market Breadth</b>: 74% Declines (1,962 vs 676 advances)</p>
                  <p>• <b>India VIX</b>: 14.22 (<span className="text-rose-600 font-bold">+7.19%</span> structural risk spike)</p>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                  Synthesized regime: High energy input drag across Auto/OMC sectors.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-bold px-2 py-0.5">
                  ⚡ View Deep Research
                </span>
                <span className="rounded bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5">
                  🤖 Open in Claude Desk
                </span>
              </div>
            </div>
          </div>

          {/* Alert Channel Toggles */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Configured Alert Channels (All Enabled by Default)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
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
              ].map((item) => (
                <div
                  key={item.key}
                  onClick={() =>
                    setActiveAlerts((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                  }
                  className={cn(
                    "cursor-pointer rounded-xl border p-2.5 transition-all flex items-start gap-2.5",
                    activeAlerts[item.key]
                      ? "border-sky-500/40 bg-sky-500/5 text-foreground"
                      : "border-border/60 bg-card/40 text-muted-foreground opacity-60",
                  )}
                >
                  <CheckCircle2
                    className={cn(
                      "size-4 shrink-0 mt-0.5",
                      activeAlerts[item.key] ? "text-sky-500" : "text-muted-foreground/40",
                    )}
                  />
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600" />
              Direct official API webhook · Zero spam · Free forever
            </span>
            <a
              href="/help#telegram"
              className="text-sky-600 hover:underline font-semibold"
              onClick={() => setShowModal(false)}
            >
              Need advanced setup? →
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TelegramOneClickButton({ className }: { className?: string }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          "group inline-flex items-center gap-2.5 rounded-full border border-sky-500/40 bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-transparent px-4 py-2 text-xs font-bold text-sky-600 dark:text-sky-400 backdrop-blur-md transition-all hover:border-sky-500 hover:bg-sky-500/20 hover:scale-[1.02] active:scale-[0.98] shadow-sm",
          className,
        )}
      >
        <span className="relative flex size-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
          <span className="relative inline-flex rounded-full size-2.5 bg-sky-500" />
        </span>
        <div className="relative size-4 shrink-0 overflow-hidden">
          <Image
            src="/integrations/telegram-logo.png"
            alt="Telegram"
            width={16}
            height={16}
            className="object-contain"
          />
        </div>
        <span>Telegram Bot · 1-Click Setup</span>
      </button>

      <TelegramOneClickModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
