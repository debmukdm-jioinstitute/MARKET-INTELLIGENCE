"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { MegaMenu } from "@/components/marketing/mega-menu";
import { MobileNav } from "@/components/marketing/mobile-nav";
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

const STORY = [
  {
    act: "01",
    title: "The watchlist was never enough.",
    body:
      "Retail apps show prices. Institutions run books — NAV paths, factor exposures, attribution, and risk budgets that must reconcile before anyone trades.",
  },
  {
    act: "02",
    title: "One terminal. Every language of the desk.",
    body:
      "From Sharpe and Sortino to Brinson and VaR, Market Intelligence maps professional portfolio management onto a virtual book you can actually operate.",
  },
  {
    act: "03",
    title: "Your story starts with a free account.",
    body:
      "Spin up model portfolios, stress regimes, replay backtests, and print committee packs — without wiring a brokerage or begging for a Bloomberg seat.",
  },
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
  const { user, ready, enterGuest, isGuest } = useAuth();
  const hasAccess = ready && Boolean(user);

  return (
    <div className="marketing relative min-h-screen overflow-x-hidden bg-white text-gray-900 selection:bg-blue-600/20">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(26,115,232,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(52,168,83,0.05),transparent)]" />
      </div>

      <div className="relative z-10">
        <div className="border-b border-border bg-muted/70 py-2.5 text-center backdrop-blur-xl">
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
            <span className="font-semibold text-blue-600">LIVE DESK</span>
            <span className="mx-2 text-gray-300">·</span>
            Virtual books with institutional KPIs
            <Link href="/signup" className="ml-2 text-gray-900 underline decoration-gray-300 underline-offset-4 hover:decoration-blue-600">
              Sign up today →
            </Link>
          </p>
        </div>

        <header className="sticky top-0 z-30 border-b border-border bg-white/80 backdrop-blur-2xl backdrop-saturate-150">
          <div className="mx-auto flex h-[52px] max-w-6xl items-center justify-between gap-2 px-4 sm:px-5">
            <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-blue-600 text-[9px] font-medium text-white shadow-[var(--shadow-sm)]">
                mi
              </span>
              <span className="hidden whitespace-nowrap text-[17px] font-semibold tracking-tight text-gray-900 sm:inline">market intelligence</span>
            </Link>
            <nav className="hidden items-center gap-8 text-[13px] font-medium text-muted-foreground md:flex">
              <MegaMenu />
              <a href="#story" className="transition hover:text-gray-900">Story</a>
              <a href="#paths" className="transition hover:text-gray-900">Desk</a>
              <a href="#plans" className="transition hover:text-gray-900">Pricing</a>
            </nav>
            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
              {hasAccess ? (
                <Link
                  href="/dashboard"
                  className="whitespace-nowrap rounded-full bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white shadow-[var(--shadow-sm)] transition hover:bg-blue-600/90 sm:px-4"
                >
                  <span className="sm:hidden">{isGuest ? "Explore" : "Terminal"}</span>
                  <span className="hidden sm:inline">{isGuest ? "Continue exploring" : "Open terminal"}</span>
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void enterGuest().then(() => {
                      window.location.href = "/dashboard";
                    })}
                    className="hidden rounded-full px-4 py-1.5 text-[13px] font-medium text-muted-foreground transition hover:text-gray-900 sm:inline-flex"
                  >
                    Guest
                  </button>
                  <Link
                    href="/login"
                    className="hidden rounded-full px-4 py-1.5 text-[13px] font-medium text-muted-foreground transition hover:text-gray-900 sm:inline-flex"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="whitespace-nowrap rounded-full bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white shadow-[var(--shadow-sm)] transition hover:bg-blue-600/90 sm:px-4"
                  >
                    Start free
                  </Link>
                </>
              )}
              <MobileNav />
            </div>
          </div>
        </header>

        <section className="relative px-5 pb-4 pt-20 text-center md:pt-28">
          <Float className="left-[3%] top-6 hidden w-48 rotate-[-4deg] lg:block">
            <p className="font-mono text-[9px] tracking-widest text-blue-600">BOOK · FLAGSHIP</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">MI Flagship Global</p>
            <p className="mt-1 font-mono text-2xl tabular-nums tracking-tight text-gray-900">$90.7M</p>
            <p className="mt-1 font-mono text-xs text-emerald-700">+128.07% ITD</p>
          </Float>
          <Float className="right-[4%] top-8 hidden w-56 rotate-[2deg] lg:block">
            <p className="font-mono text-[9px] tracking-widest text-muted-foreground">NOTE · 047</p>
            <p className="mt-2 text-left text-sm font-medium text-gray-900">Alpha is the residual story.</p>
            <p className="mt-2 text-left text-xs leading-5 text-muted-foreground">
              Sharpe prices volatility. Brinson explains the sleeve. Read all three before you size the trade.
            </p>
          </Float>
          <Float className="bottom-4 left-[6%] hidden w-52 rotate-[-3deg] lg:block">
            <p className="font-mono text-[9px] text-rose-700">ATTRIBUTION</p>
            <p className="mt-2 text-left text-sm text-gray-900">Performance a PM can defend in committee.</p>
          </Float>
          <Float className="bottom-8 right-[5%] hidden w-48 rotate-[3deg] lg:block">
            <p className="font-mono text-[9px] text-muted-foreground">RISK BUDGET</p>
            <p className="mt-1 text-sm font-medium text-gray-900">TE 6% · VaR 95%</p>
            <p className="mt-2 text-[11px] text-muted-foreground">Cash is dry powder, not an afterthought.</p>
          </Float>

          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-1.5 text-xs text-muted-foreground shadow-[var(--shadow-sm)] backdrop-blur-md transition hover:border-blue-600/30 hover:bg-accent"
          >
            <span className="font-mono text-[10px] font-semibold text-blue-600">NEW</span>
            Institutional KPIs on a virtual book
            <span className="text-gray-400">Free →</span>
          </Link>

          <p className="mx-auto mt-10 max-w-lg font-mono text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
            The story of your book
          </p>
          <h1 className="mx-auto mt-4 max-w-5xl text-[clamp(2.4rem,7.5vw,5.8rem)] font-semibold leading-[0.98] tracking-tight text-gray-900">
            Everything a fund manager knows.
            <span className="mt-2 block bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 bg-clip-text text-transparent">
              Mapped.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-[17px] font-normal leading-[1.65] tracking-tight text-muted-foreground md:text-[19px]">
            A clear-room terminal for investors who want Bloomberg-grade judgment without the Bloomberg invoice —
            virtual portfolios, research, risk, and backtesting in one continuous narrative.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={hasAccess ? "/dashboard" : "/signup"}
              className="rounded-full bg-blue-600 px-7 py-3 text-[15px] font-medium text-white shadow-[var(--shadow-md)] transition hover:scale-[1.02] hover:bg-blue-600/90"
            >
              {hasAccess ? "Open terminal →" : "Start managing free →"}
            </Link>
            <a
              href="#story"
              className="rounded-full border border-border px-6 py-3 text-[15px] text-gray-900 transition hover:border-gray-300 hover:bg-muted"
            >
              See the story
            </a>
          </div>
          <div className="mx-auto mt-14 flex max-w-3xl flex-wrap justify-center gap-6 font-mono text-[11px] text-muted-foreground">
            <Tape label="SPX" val="279.31" chg="-0.35%" down />
            <Tape label="UST" val="119.91" chg="-0.68%" down />
            <Tape label="VIX" val="12.3" chg="—" />
            <Tape label="GOLD" val="221.92" chg="-0.90%" down />
          </div>
        </section>

        <div className="mt-8 border-y border-border bg-muted/50 py-5">
          <p className="text-center font-mono text-[10px] tracking-[0.4em] text-gray-400">TRUSTED TAPE · FACTOR-CONSISTENT</p>
          <div className="mt-4 overflow-hidden">
            <div className="animate-[marquee_40s_linear_infinite] flex gap-16 whitespace-nowrap px-8 font-mono text-sm text-gray-400">
              {[...LOGOS, ...LOGOS].map((logo, i) => (
                <span key={`${logo}-${i}`} className="transition hover:text-blue-600">{logo}</span>
              ))}
            </div>
          </div>
        </div>

        <section id="story" className="mx-auto max-w-6xl px-5 py-24 md:py-32">
          <p className="text-center font-mono text-[10px] tracking-[0.35em] text-blue-600">THREE ACTS</p>
          <h2 className="mt-4 text-center text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-tight text-gray-900">
            From chart watcher to book runner.
          </h2>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {STORY.map((s) => (
              <article
                key={s.act}
                className="group relative overflow-hidden rounded-3xl border border-border bg-white p-8 shadow-[var(--shadow-sm)] transition duration-300 hover:-translate-y-1 hover:border-blue-600/30 hover:shadow-[var(--shadow-lg)]"
              >
                <p className="text-3xl font-semibold text-gray-200 transition group-hover:text-blue-600">{s.act}</p>
                <h3 className="mt-6 text-xl font-semibold leading-snug tracking-tight text-gray-900">{s.title}</h3>
                <p className="mt-4 text-[15px] leading-7 text-muted-foreground">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="paths" className="border-t border-border bg-muted/40 px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">Choose where to start</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-[15px] text-muted-foreground">
              Same structure as the live terminal — pick a module, open a free account, land on your desk.
            </p>
            <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PATHS.map((path) => (
                <Link
                  key={path.title}
                  href={path.href}
                  className="group rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-sm)] transition duration-300 hover:-translate-y-1 hover:border-blue-600/30 hover:shadow-[var(--shadow-lg)]"
                >
                  <p className="text-2xl font-semibold text-gray-900">{path.title}</p>
                  <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                    {path.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="text-blue-600">·</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 font-mono text-[10px] tracking-wider text-gray-400">{path.meta}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="box" className="mx-auto max-w-6xl px-5 py-24 md:py-32">
          <h2 className="text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">Inside the box</h2>
          <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16">
            <div className="space-y-5 text-[17px] font-normal leading-[1.7] text-muted-foreground">
              <p className="text-gray-900">Not a watchlist. Not paper trading. A desk.</p>
              <p>
                NAV, alpha, Sharpe, Sortino, VaR, tracking error, Brinson — the vocabulary professionals use when capital
                is real. Here it runs on virtual books so you learn the mechanics before the mandate.
              </p>
              <p>Judgment is the product: what the number means, and what you do next.</p>
            </div>
            <ol className="space-y-4 border-l-2 border-blue-600/30 pl-6 font-mono text-sm text-gray-900">
              <li><span className="text-blue-600">01</span> Notes · annotated research</li>
              <li><span className="text-blue-600">02</span> Daily tape · macro nowcast</li>
              <li><span className="text-blue-600">03</span> Books · three model portfolios</li>
              <li><span className="text-blue-600">04</span> Tools · optimizer & scenarios</li>
              <li><span className="text-blue-600">05</span> Drills · backtests on the tape</li>
            </ol>
          </div>
        </section>

        <section id="plans" className="border-t border-border bg-muted/40 px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-4xl font-semibold tracking-tight text-gray-900">Plans</h2>
            <p className="mt-2 text-muted-foreground">Full terminal access. No card. Your book persists in this browser.</p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <Plan title="Free desk" price="$0" copy="Every current module. Virtual books. No card." cta="Create account" href="/signup" featured />
              <Plan title="Analyst" price="$0" copy="Same full access while the platform is in public preview." cta="Start free" href="/signup" />
              <Plan title="Lifetime preview" price="$0" copy="All current tracks and every update in this release." cta="Start free" href="/signup" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-28">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Questions before you join.</h2>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {FAQS.map((item) => (
              <Faq key={item.q} {...item} />
            ))}
          </div>
        </section>

        <section className="border-t border-border px-5 py-24 text-center">
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-gray-900">
            Ready to run the book?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">One account. One terminal. The whole story of modern portfolio management.</p>
          <Link
            href={hasAccess ? "/dashboard" : "/signup"}
            className="mt-8 inline-flex rounded-full bg-blue-600 px-8 py-3.5 text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition hover:bg-blue-600/90"
          >
            {hasAccess ? "Enter MI Terminal" : "Create your free desk"}
          </Link>
        </section>

        <footer className="border-t border-border bg-muted/40 px-5 py-14">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:justify-between">
            <div>
              <p className="text-xl font-semibold text-gray-900">market intelligence</p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-gray-400">
                Technical portfolio management through a virtual desk, research tape, and sequenced analytics.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-mono text-xs tracking-widest text-gray-400">ACCOUNT</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/login" className="hover:text-gray-900">Sign in</Link>
                <Link href="/signup" className="hover:text-gray-900">Create account</Link>
                <Link href="/dashboard" className="hover:text-gray-900">Terminal</Link>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-12 max-w-6xl border-t border-border pt-8 text-center font-mono text-[10px] text-gray-400">
            © MARKET INTELLIGENCE · SIMULATED TAPE · NOT INVESTMENT ADVICE
          </p>
        </footer>
      </div>
    </div>
  );
}

function Float({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <aside
      className={`absolute rounded-2xl border border-border bg-white p-4 text-left shadow-[var(--shadow-lg)] backdrop-blur-xl ${className ?? ""}`}
    >
      {children}
    </aside>
  );
}

function Tape({ label, val, chg, down }: { label: string; val: string; chg: string; down?: boolean }) {
  return (
    <span>
      <span className="text-gray-400">{label}</span>{" "}
      <span className="text-gray-900">{val}</span>{" "}
      <span className={down ? "text-rose-700" : "text-emerald-700"}>{chg}</span>
    </span>
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
    <div
      className={`rounded-2xl border p-7 transition ${
        featured
          ? "border-blue-600/30 bg-white shadow-[var(--shadow-lg)]"
          : "border-border bg-white shadow-[var(--shadow-sm)] hover:border-gray-300"
      }`}
    >
      <p className="text-2xl font-semibold text-gray-900">{title}</p>
      <p className="mt-4 text-5xl font-semibold text-gray-900">{price}</p>
      <p className={`mt-4 text-sm leading-6 ${featured ? "text-muted-foreground" : "text-gray-400"}`}>{copy}</p>
      <Link
        href={href}
        className={`mt-8 inline-flex rounded-full px-5 py-2.5 text-sm font-medium transition ${
          featured ? "bg-blue-600 text-white hover:bg-blue-600/90" : "bg-muted text-gray-900 hover:bg-gray-200"
        }`}
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="pr-4 text-lg font-medium text-gray-900 sm:text-xl">{q}</span>
        <span className="font-mono text-gray-400">{open ? "−" : "+"}</span>
      </button>
      {open ? <p className="pb-5 text-[15px] leading-7 text-muted-foreground">{a}</p> : null}
    </div>
  );
}
