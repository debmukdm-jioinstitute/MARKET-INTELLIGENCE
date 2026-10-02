"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { MegaMenu } from "@/components/marketing/mega-menu";
import { AiOutputNote } from "@/components/ui/ai-output-note";
import { ProductProof } from "@/components/marketing/product-proof";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { NewsletterSubscribeForm } from "@/components/marketing/newsletter-subscribe-form";
import { BarChart3, LineChart, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { LenisProvider } from "@/components/marketing/lenis-provider";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import { LiveDebate } from "@/components/marketing/live-debate";
import { FlippingFaqHeadline } from "@/components/marketing/flipping-faq-headline";
import { LandingHeroTerminalDemo } from "@/components/marketing/landing-hero-terminal-demo";
import { ProductHuntBadges } from "@/components/marketing/product-hunt-badges";
import { SiteFooter } from "@/components/layout/site-footer";
import { IntegrationsBentoShowcase } from "@/components/marketing/integrations-bento-showcase";
import {
  MARKETING_COMPARE_ROWS,
  MARKETING_FREE_TIER,
  MARKETING_PLAN_SAVINGS,
  MARKETING_PLANS,
} from "@/lib/marketing/pricing-marketing";
import { TelegramOneClickButton } from "@/components/telegram/telegram-one-click-modal";
import Image from "next/image";
import { BrandLogo } from "@/components/brand/brand-logo";

gsap.registerPlugin(ScrollTrigger);

const _FEATURES = [
  {
    icon: BarChart3,
    title: "Track your portfolio",
    body: "See your real profit, real risk, and real numbers in one place. Import your holdings or build a virtual portfolio in seconds.",
  },
  {
    icon: LineChart,
    title: "Research any stock",
    body: "Company snapshots, sector comparisons, and clean charts for India and US markets — no clutter, just the numbers that matter.",
  },
  {
    icon: ShieldCheck,
    title: "Know your risk",
    body: "Understand your risk and volatility before the market teaches you the hard way. Plain numbers, plainly explained.",
  },
  {
    icon: Sparkles,
    title: "Practice with zero risk",
    body: "Test ideas, run backtests, and learn portfolio management on a virtual book. No real money, no downside.",
  },
];

const _STEPS = [
  { n: "1", title: "Create a free account", body: "No card, no waiting. Sign up with just an email." },
  { n: "2", title: "Add your investments", body: "Add your holdings, or practise with a pretend portfolio of Indian and US stocks." },
  { n: "3", title: "See what matters", body: "Get instant insights on performance, risk, and where to look next." },
];

const USE_CASES = [
  {
    title: "Research",
    body: "Company intel, concall tone, credit ratings, promoter disclosures, IPO desk, and sourced AI briefs — India-first with US coverage where it matters.",
  },
  {
    title: "Monitor",
    body: "Scanner, macro tape, Telegram breaking alerts, and portfolio risk — every figure tagged with source and timestamp.",
  },
  {
    title: "Act with context",
    body: "Options Flow screener, AI Desk multi-agent debates, and backtests on a virtual book before you put real capital at risk.",
  },
];

const FEATURE_SECTIONS = [
  { title: "AI Desk", body: "Five LLM agents debate any NSE or US ticker with evidence shown. Free tier: 5 runs/month shared with Options Flow.", href: "/research/ai-desk" },
  { title: "Options Flow", body: "Three-agent screener for unusual F&O activity — data, analysis, and flagging without calling it a buy signal.", href: "/research/options-flow" },
  { title: "Screeners", body: "Nifty 500 after every close: breakouts, volume, RSI, MACD, and 25+ scans with explainable outputs.", href: "/intelligence/scanner" },
  { title: "Portfolio", body: "Import Zerodha, Upstox, or Dhan holdings — Sharpe, beta, VaR, and attribution with formulas spelled out.", href: "/portfolio" },
  { title: "Telegram Radar", body: "1-click @MarketIntelRadarBot — breaking catalysts, morning brief (Yearly), and flow alerts on your phone.", href: "/profile#telegram" },
  { title: "Macro & credit", body: "RBI transmission, stress tests, credit intelligence desk, and World Monitor geopolitical layers.", href: "/macro/india" },
];

const FAQS = [
  {
    q: "Is Market Intelligence a brokerage or trading platform?",
    a: "No. It is research, analytics, and monitoring only. We do not execute trades or hold your securities.",
  },
  {
    q: "What does the free tier include?",
    a: `${MARKETING_FREE_TIER} Upgrade anytime with a Day Pass (₹9), Monthly (₹199), or Yearly (₹1,499) — all prices include GST.`,
  },
  {
    q: "How do paid plans work?",
    a: "Checkout on /pricing via Razorpay (UPI, cards, netbanking). Day Pass is 24 hours full access; Monthly and Yearly remove AI limits and unlock full intel previews. Yearly adds exclusive briefings and priority Telegram routing.",
  },
  {
    q: "Is AI Desk output investment advice?",
    a: "No. Agents show reasoning and disagreement for education and research. Treat outputs as inputs to your own process, not buy or sell instructions.",
  },
];

export function LandingPage() {
  const router = useRouter();
  const { user, ready, enterGuest, isGuest, guestAllowed } = useAuth();
  const hasAccess = ready && Boolean(user) && (guestAllowed || !isGuest);
  const container = useRef<HTMLDivElement>(null);

  // Live metrics simulation
  const [metrics, setMetrics] = useState({
    totalValue: 29.15,
    pnl: 12825,
    pnlPercent: 0.61,
    sharpe: 1.24,
    varValue: 41574,
    varPercent: -0.87,
    
    // Grid metrics
    treynor: 316.52,
    sortino: 1.78,
    jensens: 30.11,
    infoRatio: 1.58,
    calmar: 3.11,
    sterling: 3.22,
    burke: 5.47,
    omega: 1.30,
    kappa: 0.07,
    m2: 21.72,
    appraisal: 0.89
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        const jitter = (val: number, range: number) => val + (Math.random() * range * 2 - range);
        return {
          totalValue: jitter(prev.totalValue, 0.02),
          pnl: Math.round(jitter(prev.pnl, 50)),
          pnlPercent: jitter(prev.pnlPercent, 0.02),
          sharpe: jitter(prev.sharpe, 0.01),
          varValue: Math.round(jitter(prev.varValue, 20)),
          varPercent: jitter(prev.varPercent, 0.01),
          
          treynor: jitter(prev.treynor, 0.5),
          sortino: jitter(prev.sortino, 0.01),
          jensens: jitter(prev.jensens, 0.1),
          infoRatio: jitter(prev.infoRatio, 0.01),
          calmar: jitter(prev.calmar, 0.01),
          sterling: jitter(prev.sterling, 0.01),
          burke: jitter(prev.burke, 0.02),
          omega: jitter(prev.omega, 0.01),
          kappa: jitter(prev.kappa, 0.001),
          m2: jitter(prev.m2, 0.05),
          appraisal: jitter(prev.appraisal, 0.01)
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useGSAP(() => {
    // Hero blobs parallax
    gsap.to(".hero-mesh-blob", {
      y: -150,
      stagger: 0.1,
      ease: "none",
      scrollTrigger: {
        trigger: ".marketing",
        start: "top top",
        end: "bottom top",
        scrub: true,
      }
    });

    // Dashboard entrance
    gsap.from(".landing-terminal-demo", {
      y: 40,
      opacity: 0,
      duration: 1.1,
      ease: "power4.out",
      delay: 0.15,
    });

    gsap.from(".mock-dashboard", {
      y: 60,
      opacity: 0,
      duration: 1.2,
      ease: "power4.out",
      scrollTrigger: { trigger: ".mock-dashboard", start: "top 88%" },
    });

    // Stats counter trigger (simple fade up for now to ensure stability)
    gsap.utils.toArray<Element>(".stat-card").forEach((card, _i) => {
      gsap.from(card, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
        }
      });
    });

    // Pricing rows
    gsap.from(".pricing-row", {
      y: 20,
      opacity: 0,
      stagger: 0.1,
      duration: 0.6,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".pricing-table",
        start: "top 80%",
      }
    });

    // Founder note
    gsap.from(".founder-note", {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: ".founder-note",
        start: "top 80%",
      }
    });

    // AI Desk Timeline
    const aiTl = gsap.timeline({
      scrollTrigger: {
        trigger: "#ai-desk",
        start: "top 75%",
      }
    });

    aiTl.from(".ai-desk-container", {
      y: 50,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
    });

    // FAQ items animation removed to prevent opacity bug

    // Bottom CTA Timeline
    const ctaTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".bottom-cta",
        start: "top 85%",
      }
    });

    ctaTl.from(".bottom-cta", {
      scale: 0.95,
      opacity: 0,
      duration: 0.8,
      ease: "back.out(1.2)",
    })
    .from(".trust-avatar", {
      x: 30,
      opacity: 0,
      stagger: 0.1,
      duration: 0.6,
      ease: "power2.out"
    }, "-=0.4")
    .from(".trust-logo", {
      y: 20,
      opacity: 0,
      stagger: 0.1,
      duration: 0.6,
      ease: "power2.out"
    }, "-=0.4");
  }, { scope: container });

  return (
    <LenisProvider>
      <div ref={container} className="marketing relative min-h-screen overflow-x-hidden bg-[#f6f8fc] text-gray-900 selection:bg-blue-600/20">
      {/* Ambient background blobs for the glass effect */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-[8%] h-[420px] w-[420px] rounded-full bg-blue-400/25 blur-[110px]" />
        <div className="absolute top-40 right-[5%] h-[380px] w-[380px] rounded-full bg-sky-300/25 blur-[110px]" />
        <div className="absolute bottom-0 left-[30%] h-[360px] w-[360px] rounded-full bg-violet-300/20 blur-[110px]" />
      </div>

      <div className="relative z-10">
        <div className="border-b border-white/60 bg-white/50 py-2.5 text-center backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">
            Free to start · No card needed ·{" "}
            <Link href="/pricing" className="font-medium text-gray-900 hover:underline underline-offset-4">
              See plans →
            </Link>
          </p>
        </div>

        <header className="sticky top-0 z-30 border-b border-white/50 bg-white/70 backdrop-blur-2xl backdrop-saturate-150">
          <div className="mx-auto flex h-[52px] max-w-6xl items-center justify-between gap-2 px-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-4 md:gap-6">
              <BrandLogo size="xl" priority invertOnDark={false} className="sm:h-12" />
              <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 sm:inline-flex">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sourced data
              </span>
            </div>
            <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
              <Link href="/research" className="transition hover:text-gray-900">
                Research
              </Link>
              <Link href="/markets/india" className="transition hover:text-gray-900">
                Markets
              </Link>
              <Link href="/portfolio" className="transition hover:text-gray-900">
                Portfolio
              </Link>
              <MegaMenu />
              <a href="#integrations" className="transition hover:text-gray-900">
                Integrations
              </a>
              <a href="#coverage" className="transition hover:text-gray-900">
                Data coverage
              </a>
              <a href="#pricing" className="transition hover:text-gray-900">
                Pricing
              </a>
              <Link href="/methodology" className="transition hover:text-gray-900">
                Methodology
              </Link>
            </nav>
            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
              {hasAccess ? (
                <Link
                  href="/Home"
                  className="whitespace-nowrap rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition hover:bg-blue-600/90 sm:px-4"
                >
                  <span className="sm:hidden">{isGuest ? "Explore" : "Terminal"}</span>
                  <span className="hidden sm:inline">{isGuest ? "Continue exploring" : "Open terminal"}</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-gray-900 sm:px-4"
                  >
                    Sign in
                  </Link>
                  {ready && !guestAllowed ? (
                    <Link
                      href="/signup"
                      className="whitespace-nowrap rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition hover:bg-blue-600/90 sm:px-4"
                    >
                      Sign up
                    </Link>
                  ) : (
                    <Link
                      href="/signup"
                      className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-gray-900 sm:px-4"
                    >
                      Sign up
                    </Link>
                  )}
                  {ready && guestAllowed ? (
                    <button
                      type="button"
                      onClick={() => void enterGuest().then(() => router.push("/Home"))}
                      className="whitespace-nowrap rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition hover:bg-blue-600/90 sm:px-4"
                    >
                      Open demo
                    </button>
                  ) : null}
                </>
              )}
              <MobileNav />
            </div>
          </div>
        </header>

        {/* HERO — Muse mockup layout (light) */}
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="hero-mesh-blob hero-mesh-blob-1" />
            <div className="hero-mesh-blob hero-mesh-blob-2" />
            <div className="hero-mesh-blob hero-mesh-blob-3" />
          </div>
          <section className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-12 md:grid-cols-2 md:items-center md:gap-10 md:pb-20 md:pt-16 lg:gap-14">
            <div className="max-w-xl md:max-w-none">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d9734a]">
                A free investing terminal for India
              </p>
              <h1 className="mt-5 text-[clamp(2.1rem,4.2vw,3.35rem)] font-semibold leading-[1.08] tracking-tight text-gray-900">
                See what the market is doing. Know where every number came from.
              </h1>
              <p className="mt-6 text-[17px] leading-[1.65] text-muted-foreground">
                Indian stocks, currencies, bonds, global markets, macro, company fundamentals, and AI research briefs —
                connected in one view. In the live terminal, every figure is tagged with its source and fetch time.
              </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              {hasAccess ? (
                <Link
                  href="/Home"
                  className="rounded-full bg-blue-600 px-7 py-3 text-[15px] font-medium text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition hover:scale-[1.03] hover:bg-blue-600/90"
                >
                  Open terminal →
                </Link>
              ) : !ready ? null : guestAllowed ? (
                <>
                  <button
                    type="button"
                    onClick={() => void enterGuest().then(() => router.push("/Home"))}
                    className="rounded-full bg-blue-600 px-7 py-3 text-[15px] font-medium text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition hover:scale-[1.03] hover:bg-blue-600/90"
                  >
                    Open live demo →
                  </button>
                  <Link
                    href="/signup"
                    className="rounded-full border border-white/70 bg-white/50 px-6 py-3 text-[15px] font-medium text-gray-900 shadow-[var(--shadow-sm)] backdrop-blur-md transition hover:bg-white/80"
                  >
                    Create free account
                  </Link>
                  <Link
                    href="/pricing"
                    className="rounded-full border border-[#e8845c]/35 bg-[#e8845c]/10 px-6 py-3 text-[15px] font-medium text-[#b85a34] shadow-[var(--shadow-sm)] backdrop-blur-md transition hover:bg-[#e8845c]/15"
                  >
                    View plans
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="rounded-full bg-blue-600 px-7 py-3 text-[15px] font-medium text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition hover:scale-[1.03] hover:bg-blue-600/90"
                  >
                    Start free →
                  </Link>
                  <Link
                    href="/pricing"
                    className="rounded-full border border-white/70 bg-white/50 px-6 py-3 text-[15px] font-medium text-gray-900 shadow-[var(--shadow-sm)] backdrop-blur-md transition hover:bg-white/80"
                  >
                    Plans from ₹9
                  </Link>
                </>
              )}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {guestAllowed
                ? "Explore live data as a guest, or sign in for 5 free AI analyses/month. Day Pass and subscriptions unlock unlimited runs."
                : "Sign in free — 5 AI Desk + Options Flow runs/month. Upgrade on /pricing when you need more."}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <TelegramOneClickButton />
              <Link
                href="/connect/claude"
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent px-4 py-2 text-xs font-bold text-amber-800 backdrop-blur-md transition-all hover:border-amber-500 hover:bg-amber-500/20 hover:scale-[1.02] shadow-sm"
              >
                <div className="relative size-4 shrink-0 overflow-hidden rounded">
                  <Image
                    src="/integrations/claude-logo.png"
                    alt="Claude AI"
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                </div>
                <span>Claude AI (MCP) · Connected</span>
              </Link>
            </div>
            </div>

            <LandingHeroTerminalDemo />
          </section>
        </div>

        {/* Portfolio preview — same interactive glass mock as before */}
        <section className="relative px-5 pt-12 md:pt-16">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Portfolio analytics</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              Risk, attribution, and quant metrics in one desk
            </h2>
          </div>
          <div className="mock-dashboard relative mx-auto max-w-4xl [perspective:1600px]">
            <div
              className="relative mx-auto rounded-3xl border border-white/70 bg-white/50 p-4 shadow-[0_30px_80px_-20px_rgba(30,58,138,0.35)] backdrop-blur-2xl sm:p-6"
              style={{ transform: "rotateX(8deg) rotateZ(-1deg)" }}
            >
              <div className="flex items-center justify-between border-b border-white/70 pb-3">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-rose-400/70" />
                  <span className="size-2.5 rounded-full bg-amber-400/70" />
                  <span className="size-2.5 rounded-full bg-emerald-400/70" />
                </div>
                <p className="text-sm text-muted-foreground">Your portfolio</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MockStat label="Total value" value={`₹${metrics.totalValue.toFixed(2)} L`} trend="+4.13%" up />
                <MockStat label="Today's P&L" value={`+₹${metrics.pnl.toLocaleString()}`} trend={`+${metrics.pnlPercent.toFixed(2)}%`} up />
                <MockStat label="Sharpe ratio" value={metrics.sharpe.toFixed(2)} trend="steady" />
                <MockStat label="Value at risk" value={`₹${metrics.varValue.toLocaleString()}`} trend={`${metrics.varPercent.toFixed(2)}%`} />
              </div>
              <div className="mt-4 relative h-36 sm:h-48 overflow-hidden rounded-2xl border border-white/60 bg-white/40">
                {/* A mock chart */}
                <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 100">
                  <defs>
                    <linearGradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgb(37 99 235)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="rgb(37 99 235)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  <path d="M0 25h400M0 50h400M0 75h400" stroke="rgba(0,0,0,0.04)" strokeWidth="1" strokeDasharray="4 4" />
                  
                  {/* Area */}
                  <path
                    d="M 0 85 C 30 80, 50 90, 80 75 C 110 60, 130 65, 160 50 C 190 35, 210 50, 240 40 C 270 30, 290 20, 320 25 C 350 30, 370 15, 400 10 L 400 100 L 0 100 Z"
                    fill="url(#chart-grad)"
                  />
                  
                  {/* Line */}
                  <path
                    d="M 0 85 C 30 80, 50 90, 80 75 C 110 60, 130 65, 160 50 C 190 35, 210 50, 240 40 C 270 30, 290 20, 320 25 C 350 30, 370 15, 400 10"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.5)] pointer-events-none" />
                
                {/* Advanced Overlay Data */}
                <div className="absolute left-4 top-4 flex gap-6 sm:left-6 sm:top-5">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Alpha vs Nifty 50</p>
                    <p className="text-sm font-bold text-emerald-600">+4.2%</p>
                  </div>
                  <div className="hidden sm:block space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Portfolio Beta</p>
                    <p className="text-sm font-bold text-gray-900">0.85</p>
                  </div>
                  <div className="hidden sm:block space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Max Drawdown</p>
                    <p className="text-sm font-bold text-rose-500">-12.4%</p>
                  </div>
                  <div className="hidden md:block space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Win Rate</p>
                    <p className="text-sm font-bold text-gray-900">68%</p>
                  </div>
                </div>

                {/* Active Point Indicator (Mocked hover state) */}
                <div className="absolute top-[21%] left-[78.5%] -translate-x-1/2 -translate-y-1/2 hidden sm:block">
                  <div className="relative flex flex-col items-center">
                    <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap mb-1 font-medium">
                      Nov 24 • ₹28.5L
                    </div>
                    <div className="w-[1px] h-[85px] bg-gray-900/20" />
                    <div className="absolute bottom-0 size-3 rounded-full bg-white border-2 border-blue-600 shadow-[0_0_0_2px_rgba(37,99,235,0.2)]" />
                  </div>
                </div>
              </div>
              
              {/* Dense Analytical Metrics Grid */}
              <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3 rounded-2xl border border-white/60 bg-white/40 p-4 backdrop-blur-md sm:grid-cols-4 md:grid-cols-6">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Sharpe Ratio</p>
                  <p className="text-[13px] font-bold text-gray-900">{metrics.sharpe.toFixed(2)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Treynor Ratio</p>
                  <p className="text-[13px] font-bold text-emerald-600">+{metrics.treynor.toFixed(2)}%</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Sortino Ratio</p>
                  <p className="text-[13px] font-bold text-gray-900">{metrics.sortino.toFixed(2)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Jensen's Alpha</p>
                  <p className="text-[13px] font-bold text-emerald-600">+{metrics.jensens.toFixed(2)}%</p>
                </div>
                <div className="space-y-0.5 hidden sm:block">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Info Ratio</p>
                  <p className="text-[13px] font-bold text-gray-900">{metrics.infoRatio.toFixed(2)}</p>
                </div>
                <div className="space-y-0.5 hidden sm:block">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Calmar Ratio</p>
                  <p className="text-[13px] font-bold text-gray-900">{metrics.calmar.toFixed(2)}</p>
                </div>
                <div className="space-y-0.5 hidden sm:block">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Sterling Ratio</p>
                  <p className="text-[13px] font-bold text-gray-900">{metrics.sterling.toFixed(2)}</p>
                </div>
                <div className="space-y-0.5 hidden sm:block">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Burke Ratio</p>
                  <p className="text-[13px] font-bold text-gray-900">{metrics.burke.toFixed(2)}</p>
                </div>
                <div className="space-y-0.5 hidden md:block">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Omega Ratio</p>
                  <p className="text-[13px] font-bold text-gray-900">{metrics.omega.toFixed(2)}</p>
                </div>
                <div className="space-y-0.5 hidden md:block">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Kappa Ratio</p>
                  <p className="text-[13px] font-bold text-gray-900">{metrics.kappa.toFixed(2)}</p>
                </div>
                <div className="space-y-0.5 hidden md:block">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">M² (Modigliani)</p>
                  <p className="text-[13px] font-bold text-emerald-600">+{metrics.m2.toFixed(2)}%</p>
                </div>
                <div className="space-y-0.5 hidden md:block">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Appraisal Ratio</p>
                  <p className="text-[13px] font-bold text-gray-900">{metrics.appraisal.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* floating glass chips for depth */}
            <div
              className="absolute -top-8 -left-6 hidden w-44 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:block"
              style={{ transform: "rotateZ(-6deg)" }}
            >
              <p className="text-sm text-muted-foreground">Risk check</p>
              <p className="mt-1 text-sm font-medium text-gray-900">Well diversified</p>
            </div>
            <div
              className="absolute -right-6 bottom-6 hidden w-48 rounded-2xl border border-white/70 bg-white/70 p-3 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:block"
              style={{ transform: "rotateZ(5deg)" }}
            >
              <p className="text-sm text-muted-foreground">Research</p>
              <p className="mt-1 text-sm font-medium text-gray-900">RELIANCE · +0.61%</p>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section aria-label="At a glance" className="mx-auto mt-16 max-w-6xl px-5">
          <ul className="grid gap-3 rounded-2xl border border-white/70 bg-white/50 p-4 text-sm text-gray-700 shadow-[var(--shadow-sm)] backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-4">
            <li><span className="font-semibold text-gray-900">Pricing.</span> Free tier, ₹9 Day Pass, ₹199/mo, ₹1,499/yr — <Link href="/pricing" className="text-blue-600 hover:underline">all plans</Link>.</li>
            <li><span className="font-semibold text-gray-900">Coverage.</span> NSE/BSE, F&amp;O universe, US names, RBI macro, credit &amp; promoter intel.</li>
            <li><span className="font-semibold text-gray-900">Integrations.</span> Claude MCP terminal, Telegram @MarketIntelRadarBot, Razorpay billing.</li>
            <li><span className="font-semibold text-gray-900">Not advice.</span> Research only. <Link href="/methodology" className="text-blue-600 hover:underline">Methodology</Link></li>
          </ul>
        </section>

        {/* THREE USE CASES */}
        <section id="product" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-24 md:pt-32">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Built for three jobs</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Research, monitor, practice</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {USE_CASES.map((u) => (
              <div key={u.title} className="rounded-3xl border border-white/70 bg-white/50 p-6 shadow-[var(--shadow-sm)] backdrop-blur-xl">
                <h3 className="text-lg font-semibold tracking-tight text-gray-900">{u.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{u.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-24 md:pt-32">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">From sign-up to insight in three steps</h2>
          </div>
          <ol className="grid gap-5 md:grid-cols-3">
            {[
              { title: "Create your free account", body: guestAllowed ? "Sign up in seconds, or just look around as a guest. No brokerage account, no card needed." : "Sign up in seconds. No brokerage account, no card needed." },
              { title: "Add your investments", body: "Add your holdings, or practise with a pretend portfolio of Indian and US stocks." },
              { title: "Learn before you invest", body: "Check your risk, test ideas on past data, and ask the AI desk — all without risking a single rupee." },
            ].map((step, i) => (
              <li key={step.title} className="rounded-3xl border border-white/70 bg-white/50 p-6 shadow-[var(--shadow-sm)] backdrop-blur-xl">
                <span className="grid size-9 place-items-center rounded-full bg-blue-600 text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <ProductProof
          hasAccess={hasAccess}
          guestAllowed={guestAllowed}
          onOpenDemo={() => void enterGuest().then(() => router.push("/Home"))}
        />

        {/* FEATURE SECTIONS */}
        <section id="features" className="mx-auto mt-24 max-w-6xl scroll-mt-20 px-5 md:mt-32">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">What is inside</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">AI Desk, flow, screeners, and macro in one terminal</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_SECTIONS.map((f) => (
              <div key={f.title} className="rounded-3xl border border-white/70 bg-white/50 p-6 shadow-[var(--shadow-sm)] backdrop-blur-xl">
                <h3 className="text-lg font-semibold tracking-tight text-gray-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
                <Link href={hasAccess ? f.href : "/signup"} className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
                  {hasAccess ? "Open →" : "Sign in free →"}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* AI DESK SHOWCASE */}
        <section id="ai-desk" className="relative border-y border-white/60 bg-white/30 px-5 py-24 backdrop-blur-xl md:py-32 overflow-hidden">
          {/* Ambient background glows for 3D depth */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] bg-blue-500/10 rounded-[100%] blur-[120px] pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <p className="text-sm font-bold tracking-[0.2em] text-blue-600 uppercase">AI Desk</p>
              <h2 className="mt-3 text-[clamp(2rem,5vw,3.25rem)] font-bold tracking-tight text-gray-900 leading-[1.1]">
                Multi-agent research lab
              </h2>
              <p className="mt-5 text-lg text-gray-600 leading-relaxed">
                Pick any ticker — five LLM agents argue fundamentals, sentiment, and technicals with citations. Free accounts share 5 runs/month with Options Flow; paid plans are unlimited.
              </p>
            </div>

            {/* The 3D Glassmorphism Container */}
            <div className="ai-desk-container relative mx-auto max-w-5xl rounded-[2.5rem] border border-white/80 bg-white/70 p-6 shadow-[0_30px_80px_-20px_rgba(37,99,235,0.15)] sm:p-10">
              
              <div className="mb-8 flex items-center justify-between border-b border-gray-200/50 pb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Trading desk — recorded sample debate</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">NSE · ADANIPORTS · INR · sample run, not live</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 border border-white/70 shadow-sm">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Sample</span>
                </div>
              </div>

              {/* Agent Cards Grid */}
              <LiveDebate />
              <AiOutputNote
                className="mt-6"
                evidenceAsOf="sample run; headlines cited in the debate are from that run"
                disagreement="Fundamental analyst bearish, sentiment analyst bullish, technical analyst neutral."
              />

            </div>

            <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={hasAccess ? "/research/ai-desk" : "/signup"}
                className="inline-flex rounded-full bg-blue-600 px-8 py-4 text-[15px] font-semibold text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition hover:scale-[1.03] hover:bg-blue-600/90"
              >
                {hasAccess ? "Open AI Desk →" : "Start free — 5 AI runs/mo →"}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex rounded-full border border-white/80 bg-white/60 px-8 py-4 text-[15px] font-semibold text-gray-900 shadow-sm backdrop-blur-md transition hover:bg-white/90"
              >
                Unlimited from ₹199/mo
              </Link>
            </div>
          </div>
        </section>

        {/* ECOSYSTEM INTEGRATIONS: CLAUDE AI & TELEGRAM BOT SHOWCASE */}
        <IntegrationsBentoShowcase />

        {/* DATA METHODOLOGY */}
        <section id="coverage" className="cv-section mx-auto max-w-6xl scroll-mt-20 px-5 pt-24 md:pt-32">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Data coverage &amp; methodology</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Know where every number comes from</h2>
          </div>
          <dl className="grid gap-5 rounded-3xl border border-white/70 bg-white/50 p-6 shadow-[var(--shadow-sm)] backdrop-blur-xl sm:grid-cols-2 sm:p-8">
            {[
              ["Providers", "NSE India and Upstox for Indian equities and derivatives; RBI and public open-data portals for macro; Yahoo Finance and FRED for global series."],
              ["Timestamps", "Each figure shows its source and when it was fetched. Outside market hours you see the last close."],
              ["Adjustments", "Models, scans and backtests state their assumptions. Backtests exclude some real-world costs."],
              ["Caveats", "Quotes may be delayed and can contain errors. Guest portfolios are simulated. Nothing here is investment advice."],
            ].map(([t, d]) => (
              <div key={t}>
                <dt className="text-sm font-semibold text-gray-900">{t}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-gray-600">{d}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-center text-sm"><Link href="/methodology" className="font-medium text-blue-600 hover:underline">Read the full methodology →</Link></p>
        </section>

        {/* PRICING */}
        <section id="pricing" className="mx-auto max-w-5xl px-5 py-24 md:py-32">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold tracking-[0.2em] text-blue-600 uppercase">Plans &amp; billing</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">The three plans</h2>
            <p className="mt-4 max-w-2xl mx-auto text-[17px] text-muted-foreground leading-relaxed">
              All prices in INR, GST included. Pay with Razorpay — UPI, cards, or netbanking.{" "}
              <span className="text-foreground font-medium">{MARKETING_FREE_TIER.split(".")[0]}.</span>
            </p>
          </div>

          <div className="pricing-table grid gap-4 md:grid-cols-3">
            {MARKETING_PLANS.map((plan) => (
              <article
                key={plan.id}
                className="pricing-row flex flex-col justify-between gap-4 rounded-3xl border border-white/70 bg-white/50 p-6 shadow-[var(--shadow-sm)] backdrop-blur-xl"
              >
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-gray-900">
                    {plan.price}
                    <span className="text-sm font-normal text-muted-foreground">{plan.interval}</span>
                  </p>
                  {plan.worksOut ? <p className="mt-1 text-xs font-semibold text-blue-600">{plan.worksOut}</p> : null}
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{plan.description}</p>
                </div>
                <Link
                  href={hasAccess ? "/pricing" : "/signup"}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-600/90"
                >
                  {hasAccess ? plan.cta : "Sign in to checkout"}
                </Link>
              </article>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground leading-relaxed">{MARKETING_PLAN_SAVINGS}</p>

          <div className="pricing-table mt-10 overflow-hidden rounded-3xl border border-white/70 bg-white/50 shadow-[var(--shadow-lg)] backdrop-blur-xl">
            <div className="border-b border-white/70 bg-white/40 px-4 py-3 sm:px-6">
              <p className="text-sm font-semibold text-gray-900">How we compare</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/70 text-muted-foreground">
                    <th className="px-4 py-3 font-medium" scope="col" />
                    <th className="px-4 py-3 font-semibold text-gray-900" scope="col">
                      Market Intelligence
                    </th>
                    <th className="px-4 py-3 font-medium" scope="col">
                      Tickertape Pro
                    </th>
                    <th className="px-4 py-3 font-medium" scope="col">
                      Screener
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MARKETING_COMPARE_ROWS.map((row) => (
                    <tr key={row.feature} className="pricing-row border-b border-white/60 last:border-0">
                      <th className="px-4 py-2.5 font-medium text-gray-900" scope="row">
                        {row.feature}
                      </th>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{row.mi}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.tickertape}</td>
                      <td className="px-4 py-2.5 text-gray-600">{row.screener}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gradient-to-r from-blue-600/5 via-violet-600/5 to-cyan-600/5 p-8 text-center sm:p-10">
              <p className="text-lg font-medium text-gray-900">Checkout on pricing — access activates after payment verify</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/pricing"
                  className="inline-flex rounded-full bg-blue-600 px-8 py-3.5 text-[15px] font-medium text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition hover:scale-[1.03] hover:bg-blue-600/90"
                >
                  View plans &amp; pay →
                </Link>
                <Link
                  href={hasAccess ? "/profile#plans" : "/signup"}
                  className="inline-flex rounded-full border border-white/80 bg-white/70 px-8 py-3.5 text-[15px] font-medium text-gray-900 shadow-sm backdrop-blur-md transition hover:bg-white"
                >
                  {hasAccess ? "Manage billing in profile" : "Create free account"}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="cv-section mx-auto max-w-2xl px-5 pb-28">
          <FlippingFaqHeadline />
          <div className="mt-10 flex flex-col gap-3">
            {FAQS.map((item) => (
              <Faq key={item.q} {...item} />
            ))}
          </div>
        </section>

        {/* FOUNDER STORY */}
        <section id="founder" className="cv-section mx-auto w-full px-5 py-24 md:py-32">
          <div className="founder-note mx-auto w-full max-w-6xl rounded-3xl border border-white/70 bg-white/50 p-8 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:p-12">
            <div className="mx-auto mb-8 grid size-16 place-items-center rounded-full bg-blue-100 text-3xl shadow-sm">
              👋
            </div>
            <h2 className="text-center text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-tight text-gray-900">
              A note from the founder
            </h2>
            <div className="mt-10 space-y-6 text-[17px] leading-relaxed text-gray-700 max-w-4xl mx-auto">
              <p>
                I built Market Intelligence because terminals felt cluttered, overpriced, and opaque. Students, first-time investors, and pros deserve the same sourced data — AI Desk, Options Flow, macro, and Telegram alerts without a Bloomberg bill.
              </p>
              <p>
                We ship fast; you will hit rough edges. Mail me at <a href="mailto:Deb@getmarketintelligence.in" className="font-semibold text-blue-600 hover:underline">Deb@getmarketintelligence.in</a> or upgrade on <Link href="/pricing" className="font-semibold text-blue-600 hover:underline">/pricing</Link> when you outgrow the free tier.
              </p>
              <div className="pt-6">
                <p className="font-medium text-gray-900">Warmly,</p>
                <img src="/founder.png" alt="Debabrata Mukherjee" className="mt-5 h-20 w-auto object-contain sm:h-24" />
                <p className="mt-8 text-sm text-muted-foreground italic border-t border-gray-200/60 pt-6">
                  Made with ❤️ by Debabrata Mukherjee from Jio Institute, Room no 507
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-5 pb-28">
          <div className="bottom-cta relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/50 p-8 shadow-[0_40px_100px_-20px_rgba(37,99,235,0.15)] backdrop-blur-3xl sm:p-12 md:p-16 flex flex-col md:flex-row items-center gap-12 justify-between">
            {/* Ambient gradients inside CTA for 3D light glass effect */}
            <div className="absolute -top-32 -left-32 h-[400px] w-[400px] rounded-full bg-blue-300/30 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-sky-300/30 blur-[100px] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-white/10 pointer-events-none" />
            
            <div className="relative z-10 w-full max-w-md text-left">
              <h2 className="text-[clamp(2.2rem,4.5vw,3.8rem)] font-bold tracking-tight text-gray-900 leading-[1.05]">
                Your money deserves better tools.
              </h2>
              <p className="mt-5 text-[15px] sm:text-[17px] text-gray-600 leading-relaxed max-w-[360px]">
                Free tier today. Day Pass tomorrow. Yearly when you want every briefing and unlimited AI.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href={hasAccess ? "/Home" : "/signup"}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-4 text-[15px] font-semibold text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition-transform hover:scale-[1.03] hover:bg-blue-600/90"
                >
                  {hasAccess ? "Open terminal →" : "Start free →"}
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white/80 px-8 py-4 text-[15px] font-semibold text-gray-900 shadow-sm transition hover:bg-white"
                >
                  See pricing
                </Link>
              </div>
            </div>

            <div className="relative z-10 flex w-full flex-col items-center md:w-auto md:items-end">
              {/* Overlapping Avatars with full face focus */}
              <div className="mb-10 flex -space-x-3 sm:-space-x-4 justify-center md:justify-end">
                {[1, 2, 3, 4].map((id) => (
                  <div key={id} className="trust-avatar relative size-20 sm:size-24 rounded-full border-2 border-white/60 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.15)] bg-white overflow-hidden ring-4 ring-white/40">
                    <img src={`/faces/face${id}.png`} alt="Trusted User" className="h-full w-full object-cover object-top" />
                  </div>
                ))}
              </div>
              
              <p className="mb-4 w-full text-center text-[11px] font-bold tracking-[0.2em] text-gray-500 uppercase md:text-right">
                Trusted by people working in
              </p>
              
              {/* Firm Logos Grid - Moving Animation */}
              <div className="relative flex max-w-[400px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
                <div className="flex w-max items-center gap-3 animate-[marquee_20s_linear_infinite] hover:[animation-play-state:paused]">
                  {[
                    { name: "JPMorganChase", logoUrl: "/images/logos/logo1.png" },
                    { name: "Reliance Foundation", logoUrl: "/images/logos/logo2.png" },
                    { name: "Reliance", logoUrl: "/images/logos/logo3.png" },
                    { name: "IBM", logoUrl: "/images/logos/logo4.png" },
                    // Repeat for infinite effect
                    { name: "JPMorganChase2", logoUrl: "/images/logos/logo1.png" },
                    { name: "Reliance Foundation2", logoUrl: "/images/logos/logo2.png" },
                    { name: "Reliance2", logoUrl: "/images/logos/logo3.png" },
                    { name: "IBM2", logoUrl: "/images/logos/logo4.png" }
                  ].map((firm) => (
                    <div key={firm.name} className="flex flex-col items-center justify-center rounded-2xl border border-white/80 bg-white/60 px-5 py-3 shadow-sm backdrop-blur-md min-w-[120px] h-[76px]">
                      <img src={firm.logoUrl} alt={firm.name} className="h-7 w-auto max-w-[90px] object-contain mix-blend-multiply opacity-80 grayscale hover:grayscale-0 transition-all duration-300" />
                      <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider text-gray-500">Employees</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/60 bg-white/40 px-5 py-14 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:justify-between">
            <div>
              <BrandLogo size="lg" href="/" invertOnDark={false} />
              <p className="mt-3 max-w-sm text-sm leading-6 text-gray-400">
                India-first market intelligence — screeners, AI Desk, Options Flow, macro, and Telegram alerts. Not investment advice.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="text-sm font-semibold tracking-widest text-gray-400 uppercase">Account</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/login" className="hover:text-gray-900">Sign in</Link>
                <Link href="/signup" className="hover:text-gray-900">Create account</Link>
                <Link href="/pricing" className="hover:text-gray-900">Plans &amp; billing</Link>
                <Link href="/Home" className="hover:text-gray-900">Terminal</Link>
                <Link href="/help" className="hover:text-gray-900">Help &amp; integrations</Link>
              </div>
            </div>
            <div className="w-full max-w-sm text-sm text-muted-foreground">
              <p className="text-sm font-semibold tracking-widest text-gray-400 uppercase">Newsletter</p>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Market wrap-ups and product updates, straight to your inbox. No account required.
              </p>
              <NewsletterSubscribeForm className="mt-3" />
            </div>
          </div>
          <div className="mx-auto mt-12 max-w-6xl">
            <SiteFooter variant="marketing" className="border-0 bg-transparent px-0 py-0 backdrop-blur-none" />
          </div>
          <div className="mx-auto mt-10 max-w-6xl border-t border-white/60 pt-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-400">Featured on</p>
            <div className="mt-4">
              <ProductHuntBadges />
            </div>
          </div>
        </footer>
      </div>
      </div>
    </LenisProvider>
  );
}

function MockStat({ label, value, trend, up }: { label: string; value: string; trend: string; up?: boolean }) {
  return (
    <div className="stat-card rounded-2xl border border-white/60 bg-white/60 p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900 sm:text-base">{value}</p>
      <p className={`mt-0.5 text-[11px] ${up ? "text-emerald-600" : "text-muted-foreground"}`}>{trend}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item rounded-2xl border border-white/70 bg-white/50 px-5 backdrop-blur-xl transition hover:bg-white/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="pr-4 text-[15px] font-medium text-gray-900">{q}</span>
        <span className="text-lg text-blue-600">{open ? "−" : "+"}</span>
      </button>
      {open ? <p className="pb-4 text-sm leading-7 text-muted-foreground">{a}</p> : null}
    </div>
  );
}
