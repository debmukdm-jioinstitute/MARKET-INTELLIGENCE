"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { MegaMenu } from "@/components/marketing/mega-menu";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { NewsletterSubscribeForm } from "@/components/marketing/newsletter-subscribe-form";
import {
  BarChart3,
  LineChart,
  ShieldCheck,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { AnimatedHeadline } from "@/components/marketing/animated-headline";
import { LenisProvider } from "@/components/marketing/lenis-provider";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/ScrollTrigger";
import { LiveDebate } from "@/components/marketing/live-debate";
import { FlippingFaqHeadline } from "@/components/marketing/flipping-faq-headline";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
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

const STEPS = [
  { n: "1", title: "Create a free account", body: "No card, no waiting. Sign up with just an email." },
  { n: "2", title: "Build your book", body: "Add your holdings, or start from a ready-made virtual portfolio." },
  { n: "3", title: "See what matters", body: "Get instant insights on performance, risk, and where to look next." },
];

const STATS = [
  { 
    value: "15+", 
    label: "Advanced Metrics", 
    desc: "From basic P&L to Sharpe, Beta, and Max Drawdown. We break down the math so you can just focus on what it means for your money." 
  },
  { 
    value: "200+", 
    label: "Global Stocks", 
    desc: "Track the biggest movers across both the NSE and US markets. Build your dream cross-border portfolio effortlessly." 
  },
  { 
    value: "Live", 
    label: "Market Data", 
    desc: "No more hitting refresh. Watch your portfolio update in real-time as the market moves, giving you the pulse of your investments." 
  },
  { 
    value: "₹0", 
    label: "To Get Started", 
    desc: "Your financial clarity shouldn't come with a subscription fee. Create an account, build a book, and explore — completely on us." 
  },
];

const FAQS = [
  {
    q: "Is Market Intelligence a real trading platform?",
    a: "No. Market Intelligence is a research, portfolio-tracking, and analytics platform. It is designed to help users track holdings, research stocks, understand portfolio risk, and analyse performance. It does not execute real trades through the platform.",
  },
  {
    q: "Do I need a credit card to use Market Intelligence?",
    a: "No. platform is free to start and does not require a credit card. The listed plan includes the platform's available features without a time limit.",
  },
  {
    q: "Does Market Intelligence have AI-powered research?",
    a: "Yes. The website features an AI Desk, described as a multi-agent research environment. It can run a live debate involving different AI analyst roles covering areas such as fundamentals, sentiment and technical analysis for a selected ticker.",
  },
  {
    q: "Is the AI Desk giving investment recommendations?",
    a: "The AI Desk presents analytical perspectives from different analyst agents, including fundamental, sentiment and technical perspectives. These outputs should be treated as research information rather than personalised investment advice or instructions to buy or sell securities.",
  },
];

const COMPARISON_FEATURES = [
  { name: "Live Market Data & Research", mi: true, traditional: false },
  { name: "Advanced Portfolio Analytics (Sharpe, Beta, VaR)", mi: true, traditional: false },
  { name: "Global Stocks Coverage (NSE & US)", mi: true, traditional: "Extra Add-on" },
  { name: "Institutional Grade Flow & Sweeps", mi: true, traditional: "Expensive Tier" },
  { name: "Automated Daily Macro Tape", mi: true, traditional: false },
  { name: "Clean, Ad-free Terminal Experience", mi: true, traditional: false },
  { name: "Cost", mi: "₹0 / Forever", traditional: "₹4,000-₹1,60,000 / month" },
];

export function LandingPage() {
  const { user, ready, enterGuest, isGuest } = useAuth();
  const hasAccess = ready && Boolean(user);
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
    gsap.from(".mock-dashboard", {
      y: 60,
      opacity: 0,
      duration: 1.2,
      ease: "power4.out",
      delay: 0.2
    });

    // Stats counter trigger (simple fade up for now to ensure stability)
    gsap.utils.toArray(".stat-card").forEach((card: any, i) => {
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
            Free while we're in beta. No card, no catch.{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:underline underline-offset-4">
              Start free →
            </Link>
          </p>
        </div>

        <header className="sticky top-0 z-30 border-b border-white/50 bg-white/60 backdrop-blur-2xl backdrop-saturate-150">
          <div className="mx-auto flex h-[52px] max-w-6xl items-center justify-between gap-2 px-4 sm:px-5">
            <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
              <img src="/logo.png" alt="Market Intelligence" className="h-10 sm:h-12 w-auto mix-blend-multiply dark:invert" />
            </Link>
            <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
              <MegaMenu />
              <a href="#features" className="transition hover:text-gray-900">Features</a>
              <a href="#how" className="transition hover:text-gray-900">How it works</a>
              <a href="#faq" className="transition hover:text-gray-900">FAQ</a>
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
                  <button
                    type="button"
                    onClick={() => void enterGuest().then(() => {
                      window.location.href = "/Home";
                    })}
                    className="hidden rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-gray-900 sm:inline-flex"
                  >
                    Try as guest
                  </button>
                  <Link
                    href="/login"
                    className="hidden rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-gray-900 sm:inline-flex"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="whitespace-nowrap rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-[var(--shadow-sm)] transition hover:bg-blue-600/90 sm:px-4"
                  >
                    Sign up
                  </Link>
                </>
              )}
              <MobileNav />
            </div>
          </div>
        </header>

        {/* HERO */}
        <div className="relative overflow-hidden">
          {/* Mesh Background */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
             <div className="hero-mesh-blob hero-mesh-blob-1" />
             <div className="hero-mesh-blob hero-mesh-blob-2" />
             <div className="hero-mesh-blob hero-mesh-blob-3" />
          </div>

          <section className="relative px-5 pt-16 md:pt-24">
            <div className="mx-auto max-w-4xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-1.5 text-sm text-muted-foreground shadow-[var(--shadow-sm)] backdrop-blur-md">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Live market data, free to start
              </span>

              <h1 className="mx-auto mt-6 text-[clamp(2.2rem,5vw,3.8rem)] font-semibold leading-[1.1] tracking-tight text-gray-900">
                Manage money like a pro.
                <div className="mt-2 text-[clamp(1.5rem,3.5vw,2.5rem)]">
                  <AnimatedHeadline />
                </div>
              </h1>
            <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.65] text-muted-foreground">
              Track your portfolio, research stocks, and understand your risk — all in one simple dashboard.
              Free to start. No credit card.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={hasAccess ? "/Home" : "/signup"}
                className="rounded-full bg-blue-600 px-7 py-3 text-[15px] font-medium text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition hover:scale-[1.03] hover:bg-blue-600/90"
              >
                {hasAccess ? "Open terminal →" : "Sign up for free →"}
              </Link>
              {!hasAccess ? (
                <Link
                  href="/login"
                  className="rounded-full border border-white/70 bg-white/50 px-6 py-3 text-[15px] font-medium text-gray-900 shadow-[var(--shadow-sm)] backdrop-blur-md transition hover:bg-white/80"
                >
                  Log in
                </Link>
              ) : null}
              <a
                href="#how"
                className="rounded-full border border-white/70 bg-white/50 px-6 py-3 text-[15px] text-gray-900 backdrop-blur-md transition hover:bg-white/80"
              >
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No credit card · Free forever plan · 2-minute setup</p>
          </div>

          {/* Glass dashboard mockup */}
          <div className="mock-dashboard relative mx-auto mt-16 max-w-4xl [perspective:1600px]">
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
      </div>

        {/* STATS STRIP */}
        <section className="mx-auto mt-20 max-w-6xl px-5">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div 
                key={s.label} 
                className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white/50 p-6 shadow-[var(--shadow-sm)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:bg-white/80 hover:shadow-[var(--shadow-lg)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-violet-600/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative z-10 flex h-full flex-col">
                  <p className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{s.value}</p>
                  <p className="mt-2 text-[15px] font-semibold tracking-tight text-blue-600">{s.label}</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600 transition-colors group-hover:text-gray-900">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOUNDER LETTER (Replaces Features) */}
        <section id="features" className="mx-auto w-full px-5 py-24 md:py-32">
          <div className="founder-note mx-auto w-full max-w-6xl rounded-3xl border border-white/70 bg-white/50 p-8 shadow-[var(--shadow-lg)] backdrop-blur-xl sm:p-12">
            <div className="mx-auto mb-8 grid size-16 place-items-center rounded-full bg-blue-100 text-3xl shadow-sm">
              👋
            </div>
            <h2 className="text-center text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-tight text-gray-900">
              A note to our beta users
            </h2>
            <div className="mt-10 space-y-6 text-[17px] leading-relaxed text-gray-700 max-w-4xl mx-auto">
              <p>
                Hey there,
              </p>
              <p>
                I built Market Intelligence because I was tired of cluttered, expensive, and overwhelming financial tools. I wanted a space where anyone — whether you're a student, a new investor, or a seasoned trader — could see their money clearly, without the noise. 🎯
              </p>
              <p>
                This platform is designed to give you the exact tools the professionals use, but wrapped in an interface that actually feels good to use. No hidden fees, no credit card required to start, and no confusing jargon. Just clean data, beautiful charts, and insights you can trust. 🚀
              </p>
              <p>
                I'm incredibly grateful you're here. If you ever have feedback, ideas, or just want to chat about the markets, my inbox is always open. Let's build a smarter financial future, together. 🌟 I know that there will be a lot of bugs, so in case you find any, please do mail me at <a href="mailto:Deb@getmarketintelligence.in" className="font-semibold text-blue-600 hover:underline">Deb@getmarketintelligence.in</a>.
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
                Run a live multi-agent debate. Pick any ticker and watch five LLM agents analyze fundamentals, sentiment, and technicals in real-time.
              </p>
            </div>

            {/* The 3D Glassmorphism Container */}
            <div className="ai-desk-container relative mx-auto max-w-5xl rounded-[2.5rem] border border-white/80 bg-white/40 p-6 shadow-[0_30px_80px_-20px_rgba(37,99,235,0.15)] backdrop-blur-2xl sm:p-10 transition-transform duration-700 ease-out">
              
              <div className="mb-8 flex items-center justify-between border-b border-gray-200/50 pb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">Trading desk — live debate</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">ADANI PORT & SEZ LTD (ADANIPORTS) • price 1807.3</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 border border-white/70 shadow-sm">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Agents Active</span>
                </div>
              </div>

              {/* Agent Cards Grid */}
              <LiveDebate />

            </div>

            <div className="mt-16 text-center">
              <Link
                href={hasAccess ? "/Home" : "/signup"}
                className="inline-flex rounded-full bg-blue-600 px-8 py-4 text-[15px] font-semibold text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition hover:scale-[1.03] hover:bg-blue-600/90"
              >
                {hasAccess ? "Run the AI Desk →" : "Try AI Desk for free →"}
              </Link>
            </div>
          </div>
        </section>

        {/* PRICING / COMPARISON */}
        <section id="pricing" className="mx-auto max-w-5xl px-5 py-24 md:py-32">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold tracking-[0.2em] text-blue-600 uppercase">Unmatched Value</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Professional data. Without the professional price.
            </h2>
            <p className="mt-4 text-[17px] text-muted-foreground">
              See why Market Intelligence is the last financial terminal you'll ever need to open.
            </p>
          </div>

          <div className="pricing-table overflow-hidden rounded-3xl border border-white/70 bg-white/50 shadow-[var(--shadow-lg)] backdrop-blur-xl">
            <div className="grid grid-cols-[1fr_auto_auto] items-center border-b border-white/70 bg-white/40 p-4 sm:grid-cols-[1fr_200px_200px] sm:p-6">
              <div className="font-medium text-gray-500">Feature</div>
              <div className="text-center font-semibold text-gray-900">
                <img src="/logo.png" alt="Market Intelligence" className="mx-auto h-6 w-auto sm:h-7 mix-blend-multiply dark:invert" />
              </div>
              <div className="text-center font-medium text-gray-500">Traditional Terminals</div>
            </div>
            
            <div className="divide-y divide-white/70">
              {COMPARISON_FEATURES.map((feature, idx) => (
                <div key={idx} className="pricing-row grid grid-cols-[1fr_auto_auto] items-center p-4 transition-colors hover:bg-white/60 sm:grid-cols-[1fr_200px_200px] sm:p-6">
                  <div className="text-sm font-medium text-gray-900 sm:text-[15px]">{feature.name}</div>
                  <div className="flex justify-center w-[120px] sm:w-[200px]">
                    {feature.mi === true ? (
                      <span className="grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="size-4" />
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-700">{feature.mi}</span>
                    )}
                  </div>
                  <div className="flex justify-center w-[120px] text-sm text-gray-500 sm:w-[200px]">
                    {feature.traditional === false ? (
                      <span className="grid size-6 place-items-center rounded-full bg-gray-100 text-gray-400">
                        <X className="size-4" />
                      </span>
                    ) : (
                      <span className="text-center text-gray-500">{feature.traditional}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-gradient-to-r from-blue-600/5 via-violet-600/5 to-cyan-600/5 p-8 text-center sm:p-10">
              <p className="text-lg font-medium text-gray-900">Ready to upgrade your workflow?</p>
              <Link
                href={hasAccess ? "/Home" : "/signup"}
                className="mt-6 inline-flex rounded-full bg-blue-600 px-8 py-3.5 text-[15px] font-medium text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition hover:scale-[1.03] hover:bg-blue-600/90"
              >
                {hasAccess ? "Open terminal →" : "Get started for free →"}
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-2xl px-5 pb-28">
          <FlippingFaqHeadline />
          <div className="mt-10 flex flex-col gap-3">
            {FAQS.map((item) => (
              <Faq key={item.q} {...item} />
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-5 pb-28">
          <div className="bottom-cta relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] border border-blue-500/20 bg-[#0c1438] p-8 shadow-[0_40px_100px_-20px_rgba(12,20,56,0.6)] sm:p-12 md:p-16 flex flex-col md:flex-row items-center gap-12 justify-between">
            {/* Ambient gradients inside CTA */}
            <div className="absolute -top-32 -left-32 h-[400px] w-[400px] rounded-full bg-blue-600/20 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-violet-600/20 blur-[100px] pointer-events-none" />
            
            <div className="relative z-10 w-full max-w-md text-left">
              <h2 className="text-[clamp(2.2rem,4.5vw,3.8rem)] font-bold tracking-tight text-white leading-[1.05]">
                Your money deserves better tools.
              </h2>
              <p className="mt-5 text-[15px] sm:text-[17px] text-blue-200/80 leading-relaxed max-w-[320px]">
                Join for free and see your portfolio the way professionals do.
              </p>
              <Link
                href={hasAccess ? "/Home" : "/signup"}
                className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-[15px] font-semibold text-blue-900 shadow-[var(--shadow-md)] transition-transform hover:scale-[1.03] hover:bg-blue-50"
              >
                Open terminal <span aria-hidden="true" className="ml-1 transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>

            <div className="relative z-10 flex w-full flex-col items-center md:w-auto md:items-end">
              {/* Overlapping Avatars */}
              <div className="mb-10 flex -space-x-3 sm:-space-x-4 justify-center md:justify-end">
                {[12, 44, 33, 11, 5].map((imgId, i) => (
                  <div key={i} className="trust-avatar relative size-20 sm:size-24 rounded-full border-2 border-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.15)] bg-blue-950 overflow-hidden ring-4 ring-[#0c1438]">
                    {/* Using pravatar as placeholders until real assets are provided */}
                    <img src={`https://i.pravatar.cc/150?img=${imgId}`} alt="User" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
              
              <p className="mb-4 w-full text-center text-[11px] font-bold tracking-[0.2em] text-blue-300/70 uppercase md:text-right">
                Trusted by leading firms
              </p>
              
              {/* Firm Logos Grid */}
              <div className="flex flex-wrap justify-center gap-3 md:justify-end max-w-[350px]">
                {[
                  { name: "JPMorganChase", icon: "JPM" },
                  { name: "NOMURA", icon: "NMR" },
                  { name: "IBM", icon: "IBM" },
                  { name: "ditto Insurance", icon: "ditto" }
                ].map((firm) => (
                  <div key={firm.name} className="trust-logo flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md min-w-[100px] flex-1">
                    <span className="font-serif font-bold text-white/90 text-[15px]">{firm.icon}</span>
                    <span className="mt-1 text-[9px] font-medium uppercase tracking-wider text-blue-200/50">Employees</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/60 bg-white/40 px-5 py-14 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:justify-between">
            <div>
              <img src="/logo.png" alt="Market Intelligence" className="h-10 w-auto mix-blend-multiply dark:invert" />
              <p className="mt-3 max-w-sm text-sm leading-6 text-gray-400">
                A simple way to track, research, and understand your money — for everyone, not just professionals.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="text-sm font-semibold tracking-widest text-gray-400 uppercase">Account</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/login" className="hover:text-gray-900">Sign in</Link>
                <Link href="/signup" className="hover:text-gray-900">Create account</Link>
                <Link href="/Home" className="hover:text-gray-900">Terminal</Link>
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
          <p className="mx-auto mt-12 max-w-6xl border-t border-white/60 pt-8 text-center text-sm text-gray-400">
            © Market Intelligence
          </p>
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
