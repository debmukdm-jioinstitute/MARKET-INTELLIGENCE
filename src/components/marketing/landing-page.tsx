"use client";

import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import { useState } from "react";

const PATHS = [
  {
    title: "Portfolio desk",
    href: "/signup",
    meta: "15 KPIs · live books · tickets",
    points: ["Mark-to-market NAV and P&L", "Holdings ledger with virtual tickets", "Mandate, cash, and factor betas"],
  },
  {
    title: "Research workbench",
    href: "/signup",
    meta: "Universe · comparables · tape",
    points: ["Security snapshots and factor loadings", "Sector comparables on one tape", "Simulated history from 2019"],
  },
  {
    title: "Risk & attribution",
    href: "/signup",
    meta: "VaR · TE · Brinson",
    points: ["Vol, drawdown, and 95% VaR", "Name-level risk contribution", "Brinson-Fachler sector effects"],
  },
  {
    title: "Quant overlay",
    href: "/signup",
    meta: "Soon · optimizer live",
    points: ["Mean-variance and risk parity", "Regime shocks on the book", "View optimizer"],
    soon: true,
  },
  {
    title: "Backtesting",
    href: "/signup",
    meta: "Rules · rebalance · CAGR",
    points: ["60/40, quality growth, risk-parity lite", "Monthly or quarterly replay", "Growth of $1 vs equal weight"],
  },
];

const LOGOS = [
  "SPY",
  "NASDAQ",
  "UST 10Y",
  "DXY",
  "VIX",
  "BRENT",
  "GOLD",
  "MSCI",
  "IG CREDIT",
  "HY",
  "EAFE",
  "EM",
];

const FAQS = [
  {
    q: "Where should I start?",
    a: "Create a free account, then open Command. Flagship Global is the equity book; Balanced Income is multi-asset; Quant Macro is the overlay. Switch books from the top bar.",
  },
  {
    q: "Is this live brokerage?",
    a: "No. Market Intelligence is a virtual portfolio-management terminal. Marks are a deterministic, factor-consistent simulation so every book, backtest, and scenario stays internally coherent.",
  },
  {
    q: "What is actually inside the terminal?",
    a: "Portfolio KPIs (value, P&L, CAGR, alpha, beta, Sharpe, Sortino, drawdown, vol, TE, IR, VaR, cash, turnover), research, allocation, risk, attribution, quant, macro, markets, scenarios, optimizer, backtest, and committee reports.",
  },
  {
    q: "Is the account free?",
    a: "Yes. Sign up with email and a password. Your free account lives in this browser so you can return to the same desk without a card.",
  },
];

export function LandingPage() {
  const { user, ready } = useAuth();
  const signedIn = ready && user;

  return (
    <div className="marketing min-h-screen bg-[#f5f5f3] text-[#111] [font-family:var(--font-sans)]">
      <div className="border-b border-[#ecece8] bg-[#eef6ff] py-2 text-center text-[11px] tracking-wide text-[#335]">
        NEW DESK · Virtual books with institutional KPIs.{" "}
        <Link href="/signup" className="font-medium underline">
          Sign up today →
        </Link>
      </div>
      <header className="sticky top-0 z-30 border-b border-[#ecece8] bg-[#f5f5f3]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 font-[Tiny5] text-[18px] tracking-wide">
            <span className="grid size-6 place-items-center rounded-full bg-[#111] text-[10px] text-white">mi</span>
            market intelligence
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#444] md:flex">
            <a href="#paths">Desk</a>
            <a href="#box">Product</a>
            <a href="#plans">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Link href="/app" className="rounded-full bg-[#111] px-4 py-1.5 text-sm text-white">
                Open terminal
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-full border border-[#ddd] bg-white px-4 py-1.5 text-sm">
                  Sign in
                </Link>
                <Link href="/signup" className="hidden rounded-full bg-[#111] px-4 py-1.5 text-sm text-white sm:inline-flex">
                  Start free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-5 pb-8 pt-16 text-center">
        <Float className="left-[4%] top-8 hidden w-44 rotate-[-12deg] lg:block">
          <p className="font-[Tiny5] text-xs text-[#888]">BOOKS</p>
          <p className="mt-2 text-sm font-medium">MI Flagship Global</p>
          <p className="text-2xl font-semibold tracking-tight">$90.7M</p>
          <p className="text-xs text-emerald-700">+128% since inception</p>
        </Float>
        <Float className="right-[5%] top-10 hidden w-56 rotate-[6deg] lg:block">
          <p className="font-[Tiny5] text-[10px] text-[#888]">READING NOTE · 047</p>
          <p className="mt-2 text-sm font-semibold">Attention is All You Need — for books</p>
          <p className="mt-2 text-xs leading-5 text-[#666]">
            Alpha is the CAPM intercept. Sharpe is excess return per unit of vol. Read the residual, not the headline.
          </p>
        </Float>
        <Float className="bottom-6 left-[8%] hidden w-52 rotate-[-8deg] lg:block">
          <p className="font-[Tiny5] text-[10px] text-red-600">arxiv</p>
          <p className="mt-2 text-left text-sm font-medium">Performance attribution that a PM can defend</p>
        </Float>
        <Float className="bottom-10 right-[7%] hidden w-48 rotate-[8deg] lg:block">
          <p className="font-[Tiny5] text-[10px] text-[#888]">SCALE REVIEW</p>
          <p className="mt-1 text-sm font-semibold">Find the first modeled constraint</p>
          <p className="mt-2 text-[11px] text-[#777]">Tracking error budget 6%. Cash is residual dry powder.</p>
        </Float>

        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-[#555] shadow-sm ring-1 ring-[#ecece8]"
        >
          <span className="font-[Tiny5] text-[10px] text-[#3b6cff]">NEW</span>
          Read equations without freezing
          <span className="text-[#999]">Free desk →</span>
        </Link>
        <h1 className="mx-auto mt-8 max-w-5xl font-[Tiny5] text-[clamp(2.6rem,8vw,6.4rem)] leading-[0.92] tracking-wide text-[#111] [font-smooth:never] [-webkit-font-smoothing:none]">
          Everything a fund manager knows. Mapped.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[15px] leading-7 text-[#555]">
          Learn what it takes to operate a book at a professional level — virtual portfolios, research, allocation, risk,
          and backtesting, for individual investors and analysts.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href={signedIn ? "/app" : "/signup"} className="rounded-full bg-[#111] px-5 py-2.5 text-sm text-white">
            {signedIn ? "Open terminal →" : "Start managing free →"}
          </Link>
          <a href="#paths" className="rounded-full px-4 py-2.5 text-sm text-[#444]">
            See demo
          </a>
        </div>
      </section>

      <p className="pt-10 text-center font-[Tiny5] text-[11px] tracking-[0.35em] text-[#999]">SHARED AROUND THE WORLD</p>
      <div className="mt-4 overflow-hidden border-y border-[#ecece8] py-4">
        <div className="animate-[marquee_32s_linear_infinite] flex gap-12 whitespace-nowrap px-8 text-sm font-medium text-[#888]">
          {[...LOGOS, ...LOGOS].map((logo, i) => (
            <span key={`${logo}-${i}`}>{logo}</span>
          ))}
        </div>
      </div>

      <section id="paths" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center font-[Tiny5] text-4xl sm:text-5xl">Choose where to start</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PATHS.map((path) => (
            <Link
              key={path.title}
              href={path.href}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#ecece8] transition hover:-translate-y-0.5"
            >
              <p className="font-[Tiny5] text-2xl">{path.title}</p>
              <ul className="mt-4 space-y-1 text-sm text-[#555]">
                {path.points.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-[#888]">{path.meta}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="box" className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="font-[Tiny5] text-4xl sm:text-5xl">Inside the Market Intelligence box</h2>
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <div className="space-y-4 text-[15px] leading-7 text-[#444]">
            <p>Market Intelligence is not a watchlist, a paper-trading toy, or another retail charting app.</p>
            <p>
              It brings together the language of a fund desk — NAV, alpha, Sharpe, Sortino, VaR, tracking error,
              Brinson attribution — and makes it usable on a virtual book.
            </p>
            <p>You can enter from any level. The point is judgment: what the number means, and what you do next.</p>
          </div>
          <ol className="space-y-3 font-[Tiny5] text-xl">
            <li>01 Notes · annotated research</li>
            <li>02 Daily tape · macro nowcast</li>
            <li>03 Books · three model portfolios</li>
            <li>04 Tools · optimizer & scenarios</li>
            <li>05 Drills · backtests on the tape</li>
          </ol>
        </div>
      </section>

      <section id="plans" className="mx-auto max-w-6xl px-5 pb-20">
        <h2 className="font-[Tiny5] text-4xl">Plans</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Plan title="Free desk" price="$0" copy="Every current module. Virtual books. No card." cta="Create account" href="/signup" featured />
          <Plan title="Analyst" price="$0" copy="Same full access while the platform is in public preview." cta="Start free" href="/signup" />
          <Plan title="Lifetime preview" price="$0" copy="All current tracks and every update in this release." cta="Start free" href="/signup" />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-24">
        <h2 className="font-[Tiny5] text-4xl">Questions people ask before joining.</h2>
        <div className="mt-8 divide-y divide-[#ecece8] border-y border-[#ecece8]">
          {FAQS.map((item) => (
            <Faq key={item.q} {...item} />
          ))}
        </div>
      </section>

      <footer className="border-t border-[#ecece8] bg-white px-5 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:justify-between">
          <div>
            <p className="font-[Tiny5] text-lg">market intelligence</p>
            <p className="mt-2 max-w-sm text-sm text-[#666]">
              Technical portfolio management through a virtual desk, research tape, and sequenced analytics.
            </p>
          </div>
          <div className="text-sm text-[#555]">
            <p className="font-[Tiny5] text-base text-[#111]">Account</p>
            <div className="mt-2 flex flex-col gap-1">
              <Link href="/login">Sign in</Link>
              <Link href="/signup">Create account</Link>
              <Link href="/app">Terminal</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Float({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <aside className={`absolute rounded-2xl bg-white p-4 text-left shadow-lg ring-1 ring-black/5 ${className ?? ""}`}>
      {children}
    </aside>
  );
}

function Plan({
  title,
  price,
  copy,
  cta,
  href,
  featured,
}: {
  title: string;
  price: string;
  copy: string;
  cta: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-6 ring-1 ${featured ? "bg-[#111] text-white ring-[#111]" : "bg-white ring-[#ecece8]"}`}>
      <p className="font-[Tiny5] text-2xl">{title}</p>
      <p className="mt-4 font-[Tiny5] text-4xl">{price}</p>
      <p className={`mt-3 text-sm ${featured ? "text-white/70" : "text-[#555]"}`}>{copy}</p>
      <Link
        href={href}
        className={`mt-6 inline-flex rounded-full px-4 py-2 text-sm ${featured ? "bg-white text-[#111]" : "bg-[#111] text-white"}`}
      >
        {cta}
      </Link>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between py-4 text-left">
        <span className="font-[Tiny5] text-xl">{q}</span>
        <span className="text-[#999]">{open ? "–" : "+"}</span>
      </button>
      {open ? <p className="pb-4 text-sm leading-6 text-[#555]">{a}</p> : null}
    </div>
  );
}
