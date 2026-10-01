"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  Brain,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  MessageSquare,
  Network,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TelegramOneClickModal } from "@/components/telegram/telegram-one-click-modal";

type ActiveTab = "all" | "claude" | "telegram";

export function IntegrationsBentoShowcase() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [simulatedPromptIndex, setSimulatedPromptIndex] = useState(0);

  const samplePrompts = [
    {
      q: "Claude, assess NIFTY 50 vulnerability to Brent crude surging past $101 and USD/INR at 96.3.",
      tool: "get_multi_pillar_sentiment()",
      resp: "Multi-Pillar Engine flags Negative (-0.59). High crude inflation compresses OMC & Auto gross margins; Rupee depreciation exacerbates imported inflation. Defensive tilt recommended towards Healthcare & IT.",
    },
    {
      q: "Claude, check unusual options activity for RELIANCE and HDFCBANK expiry series.",
      tool: "get_options_flow(symbols: [\"RELIANCE\", \"HDFCBANK\"])",
      resp: "RELIANCE 1,180 Call writing surge observed (+42% OI concentration). HDFCBANK Put/Call Ratio inflected to 1.18 indicating put underwriting support around ₹710.",
    },
    {
      q: "Claude, give me the 5-pillar divergence between Indian equities and global benchmark indices.",
      tool: "get_global_disparity_radar()",
      resp: "High cross-regional disparity: Asian bourses decoupled (Nikkei +3.30% vs Indian bourses -0.88% tracking European FTSE -1.64% risk-off drag).",
    },
  ];

  return (
    <section id="integrations" className="relative mx-auto max-w-6xl scroll-mt-20 px-5 pt-24 md:pt-32">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-10 size-96 rounded-full bg-sky-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 size-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />

      {/* Section Header */}
      <div className="mx-auto mb-12 max-w-3xl text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary uppercase tracking-wider backdrop-blur-md">
          <Network className="size-3.5" />
          <span>Ecosystem Integrations · AI &amp; Messaging</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl leading-tight">
          Connect to Claude AI &amp; Telegram Bot
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Plug live Indian &amp; global institutional market intelligence into <b>Claude via MCP</b> for deep autonomous research, and stream instant breaking catalysts into your <b>Telegram with 1-click</b>.
        </p>

        {/* Tab Selector for Hover / Slide Navigation */}
        <div className="pt-3 flex justify-center">
          <div className="inline-flex rounded-xl border border-border/80 bg-card/60 p-1.5 backdrop-blur-xl shadow-sm">
            {[
              { id: "all" as const, label: "Full Ecosystem Flow" },
              { id: "claude" as const, label: "Claude AI (MCP)", icon: "/integrations/claude-logo.png" },
              { id: "telegram" as const, label: "Telegram Bot (1-Click)", icon: "/integrations/telegram-logo.png" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-md scale-100"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {tab.icon && (
                  <div className="relative size-3.5 shrink-0 overflow-hidden rounded">
                    <Image src={tab.icon} alt={tab.label} width={14} height={14} className="object-contain" />
                  </div>
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* CARD 1: CLAUDE AI INTEGRATION (6 or 7 cols) */}
        {(activeTab === "all" || activeTab === "claude") && (
          <div
            className={cn(
              "group relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card/80 to-card/95 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(217,119,6,0.15)] transition-all duration-500 hover:-translate-y-1 hover:border-amber-500/50 hover:shadow-[0_25px_70px_-15px_rgba(217,119,6,0.22)]",
              activeTab === "claude" ? "lg:col-span-12" : "lg:col-span-6",
            )}
          >
            {/* Ambient card corner flare */}
            <div className="absolute top-0 right-0 size-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative size-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 p-2 flex items-center justify-center shadow-inner overflow-hidden">
                    <Image
                      src="/integrations/claude-logo.png"
                      alt="Claude AI"
                      width={40}
                      height={40}
                      className="object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-foreground">Claude + Market Intelligence</h3>
                      <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                        MCP Protocol
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Anthropic Claude Desktop &amp; claude.ai native connector</p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Zero Hallucinations</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-foreground/90 leading-relaxed">
                Connect Claude directly to the live Indian &amp; global financial tape. Instead of static training data, Claude invokes real-time Market Intelligence tools to inspect live option chains, macro stress, and corporate intelligence before formulating answers.
              </p>

              {/* Interactive Claude Simulation */}
              <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-3 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
                  <span className="font-bold flex items-center gap-1.5 text-foreground">
                    <Brain className="size-3.5 text-amber-600" />
                    <span>Live MCP Tool Call Simulation</span>
                  </span>
                  <div className="flex gap-1">
                    {samplePrompts.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSimulatedPromptIndex(idx)}
                        className={cn(
                          "size-5 rounded-full text-[11px] font-bold transition-all",
                          simulatedPromptIndex === idx
                            ? "bg-amber-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                        )}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* User Prompt */}
                <div className="rounded-xl bg-card p-3 border border-border/60 text-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Investor Prompt
                  </span>
                  <p className="font-medium text-foreground">&ldquo;{samplePrompts[simulatedPromptIndex].q}&rdquo;</p>
                </div>

                {/* Tool execution badge */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="font-sans font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                    Tool invoked: {samplePrompts[simulatedPromptIndex].tool}
                  </span>
                </div>

                {/* Claude Reasoning Answer */}
                <div className="rounded-xl bg-amber-500/5 p-3 border border-amber-500/20 text-xs text-foreground/90 leading-relaxed">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block mb-1">
                    Claude Institutional Analysis:
                  </span>
                  {samplePrompts[simulatedPromptIndex].resp}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/connect/claude"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Cpu className="size-3.5" />
                  <span>Connect Claude in 60s</span>
                  <ArrowRight className="size-3.5" />
                </Link>

                <Link
                  href="/help#mcp"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <span>Read MCP Specs</span>
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* CARD 2: TELEGRAM BOT INTEGRATION WITH 1-CLICK SETUP (6 or 7 cols) */}
        {(activeTab === "all" || activeTab === "telegram") && (
          <div
            className={cn(
              "group relative overflow-hidden rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-card/80 to-card/95 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(14,165,233,0.15)] transition-all duration-500 hover:-translate-y-1 hover:border-sky-500/50 hover:shadow-[0_25px_70px_-15px_rgba(14,165,233,0.22)]",
              activeTab === "telegram" ? "lg:col-span-12" : "lg:col-span-6",
            )}
          >
            {/* Ambient card corner flare */}
            <div className="absolute top-0 right-0 size-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative size-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 p-2 flex items-center justify-center shadow-inner overflow-hidden">
                    <Image
                      src="/integrations/telegram-logo.png"
                      alt="Telegram Logo"
                      width={40}
                      height={40}
                      className="object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-foreground">Telegram Bot Radar</h3>
                      <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase">
                        Sub-Second Push
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">@MarketIntelRadarBot · Real-time exchange stream</p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 px-2.5 py-1 text-xs font-semibold text-sky-600">
                  <Radio className="size-3.5 animate-pulse text-sky-500" />
                  <span>Live 24/7 Feed</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-foreground/90 leading-relaxed">
                Receive instant market catalysts the millisecond they happen. No delays, no manual refreshes. Get morning briefs at 8:45 AM, evening sector recaps at 4:15 PM, and instant alerts when Nifty swings or crude oil spikes.
              </p>

              {/* Simulated Telegram Message Card */}
              <div className="rounded-2xl border border-sky-500/25 bg-muted/40 p-4 space-y-2.5 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-2">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <div className="size-2 rounded-full bg-sky-500 animate-ping" />
                    <span>Market Intelligence Alert</span>
                    <span className="text-[10px] bg-sky-500/10 text-sky-600 px-1.5 py-0.2 rounded font-semibold">BOT</span>
                  </div>
                  <span className="text-[11px] tabular-nums">10:30 AM IST</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-600">
                    <Flame className="size-3.5 text-rose-500 shrink-0" />
                    <span>🚨 BREAKING CATALYST: NIFTY Selloff &amp; Crude Breakout</span>
                  </div>
                  <div className="space-y-0.5 text-foreground font-medium">
                    <p>• <b>NIFTY 50</b>: 24,845.20 (<span className="text-rose-600 font-bold">-0.88%</span> · Breadth: 74% Declines)</p>
                    <p>• <b>Brent Crude</b>: $101.32 (<span className="text-rose-600 font-bold">+3.36%</span> surge above $100)</p>
                    <p>• <b>India VIX</b>: 14.22 (<span className="text-rose-600 font-bold">+7.19%</span> risk spike)</p>
                    <p>• <b>Block Deal</b>: RELIANCE 1.2M shares traded at ₹1,168.50</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                    Multi-Pillar Score: -0.59 (Negative). Drag across Auto, OMC, and Consumer.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-bold px-2 py-0.5">
                    ⚡ View Deep Dossier
                  </span>
                  <span className="rounded bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5">
                    🤖 Ask Claude
                  </span>
                </div>
              </div>

              {/* 1-Click Setup Primary CTA Button */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setTelegramModalOpen(true)}
                  className="group inline-flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 text-xs font-bold shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Send className="size-3.5" />
                  <span>Connect Telegram Bot in 1 Click</span>
                  <ExternalLink className="size-3.5 opacity-80" />
                </button>

                <Link
                  href="/help#telegram"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <span>Setup Guide in Help</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* CARD 3: ARCHITECTURAL DATA FLOW PIPELINE (Full 12 cols) */}
        {activeTab === "all" && (
          <div className="lg:col-span-12 rounded-3xl border border-border/80 bg-card/70 p-6 sm:p-8 backdrop-blur-2xl shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <Layers className="size-3.5" />
                  <span>Institutional Flow Architecture</span>
                </div>
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  How Market Intelligence Powers Your Workflow
                </h3>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                End-to-end verified data provenance
              </span>
            </div>

            {/* Visual Pipeline Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {/* Node 1 */}
              <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-2 relative group hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">1. Exchange Feeds</span>
                  <Globe className="size-4 text-blue-500" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Real-time ticks from <b>NSE India</b>, <b>BSE</b>, <b>Upstox</b>, <b>RBI</b>, <b>Yahoo Finance</b>, and <b>FRED</b>.
                </p>
                <div className="flex flex-wrap gap-1 pt-1 text-[10px]">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-medium">Equities</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-medium">F&amp;O</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-medium">Macro</span>
                </div>
              </div>

              {/* Node 2 */}
              <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-2 relative group hover:border-primary transition-colors">
                <div className="flex items-center justify-between text-xs text-primary font-bold">
                  <span>2. Multi-Pillar Engine</span>
                  <Zap className="size-4 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Synthesizes domestic breadth, global disparity, crude inflation, currency, and newsflow sentiment.
                </p>
                <div className="flex flex-wrap gap-1 pt-1 text-[10px]">
                  <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 font-bold">5-Pillar Score</span>
                  <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5 font-bold">Zero Fabrication</span>
                </div>
              </div>

              {/* Node 3 (Claude) */}
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-2 relative group hover:border-amber-500 transition-colors">
                <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-bold">
                  <div className="flex items-center gap-1.5">
                    <div className="relative size-4 overflow-hidden rounded">
                      <Image src="/integrations/claude-logo.png" alt="Claude" width={16} height={16} className="object-contain" />
                    </div>
                    <span>3A. Claude AI</span>
                  </div>
                  <Brain className="size-4 text-amber-600" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Deep analytical reasoning via MCP. Claude runs valuation models, thesis debates, and risk audits.
                </p>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-amber-600 font-semibold">claude.ai &amp; Desktop</span>
                  <span className="text-xs text-primary">Live MCP →</span>
                </div>
              </div>

              {/* Node 4 (Telegram) */}
              <div className="rounded-2xl border border-sky-500/40 bg-sky-500/5 p-4 space-y-2 relative group hover:border-sky-500 transition-colors">
                <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-300 font-bold">
                  <div className="flex items-center gap-1.5">
                    <div className="relative size-4 overflow-hidden rounded">
                      <Image src="/integrations/telegram-logo.png" alt="Telegram" width={16} height={16} className="object-contain" />
                    </div>
                    <span>3B. Telegram Bot</span>
                  </div>
                  <Send className="size-4 text-sky-500" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Instant mobile notifications for breaking catalysts, block trades, and daily morning executive briefs.
                </p>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-sky-600 font-semibold">1-Click Bot Setup</span>
                  <button
                    type="button"
                    onClick={() => setTelegramModalOpen(true)}
                    className="text-xs text-sky-600 hover:underline font-bold"
                  >
                    Connect Now →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Telegram 1-Click Setup Modal Instance */}
      <TelegramOneClickModal open={telegramModalOpen} onOpenChange={setTelegramModalOpen} />
    </section>
  );
}
