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
  const { user, ready } = useAuth();
  const signedIn = ready && user;

  return (
    <div className="marketing relative min-h-screen overflow-x-hidden bg-[#000000] text-[#f5f5f7] selection:bg-[#ff9f0a]/30">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,159,10,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(41,151,255,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_0%_80%,rgba(255,255,255,0.04),transparent)]" />
        <div className="absolute inset-0 opacity-[0.35] mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.04%22/%3E%3C/svg%3E')]" />
      </div>

      <div className="relative z-10">
        <div className="border-b border-white/[0.06] bg-black/60 py-2.5 text-center backdrop-blur-xl">
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#86868b]">
            <span className="text-[#ff9f0a]">LIVE DESK</span>
            <span className="mx-2 text-white/20">·</span>
            Virtual books with institutional KPIs
            <Link href="/signup" className="ml-2 text-[#f5f5f7] underline decoration-white/20 underline-offset-4 hover:decoration-[#ff9f0a]">
              Sign up today →
            </Link>
          </p>
        </div>

        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/70 backdrop-blur-2xl backdrop-saturate-150">
          <div className="mx-auto flex h-[52px] max-w-6xl items-center justify-between px-5">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-b from-[#3a3a3c] to-[#1c1c1e] text-[9px] font-medium text-white shadow-inner ring-1 ring-white/10">
                mi
              </span>
              <span className="font-[Tiny5] text-[17px] tracking-wide text-white">market intelligence</span>
            </Link>
            <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#a1a1a6] md:flex">
              <a href="#story" className="transition hover:text-white">Story</a>
              <a href="#paths" className="transition hover:text-white">Desk</a>
              <a href="#box" className="transition hover:text-white">Product</a>
              <a href="#plans" className="transition hover:text-white">Pricing</a>
            </nav>
            <div className="flex items-center gap-2">
              {signedIn ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-[#f5f5f7] px-4 py-1.5 text-[13px] font-medium text-black transition hover:bg-white"
                >
                  Open terminal
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-full px-4 py-1.5 text-[13px] font-medium text-[#f5f5f7] transition hover:text-white"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="hidden rounded-full bg-[#f5f5f7] px-4 py-1.5 text-[13px] font-medium text-black transition hover:bg-white sm:inline-flex"
                  >
                    Start free
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        <section className="relative px-5 pb-4 pt-20 text-center md:pt-28">
          <Float className="left-[3%] top-6 hidden w-48 rotate-[-10deg] lg:block">
            <p className="font-mono text-[9px] tracking-widest text-[#ff9f0a]">BOOK · FLAGSHIP</p>
            <p className="mt-2 text-sm font-semibold text-white">MI Flagship Global</p>
            <p className="mt-1 font-mono text-2xl tabular-nums tracking-tight text-white">$90.7M</p>
            <p className="mt-1 font-mono text-xs text-[#30d158]">+128.07% ITD</p>
          </Float>
          <Float className="right-[4%] top-8 hidden w-56 rotate-[5deg] lg:block">
            <p className="font-mono text-[9px] tracking-widest text-[#86868b]">NOTE · 047</p>
            <p className="mt-2 text-left text-sm font-medium text-white">Alpha is the residual story.</p>
            <p className="mt-2 text-left text-xs leading-5 text-[#a1a1a6]">
              Sharpe prices volatility. Brinson explains the sleeve. Read all three before you size the trade.
            </p>
          </Float>
          <Float className="bottom-4 left-[6%] hidden w-52 rotate-[-6deg] lg:block">
            <p className="font-mono text-[9px] text-[#ff453a]">ATTRIBUTION</p>
            <p className="mt-2 text-left text-sm text-white">Performance a PM can defend in committee.</p>
          </Float>
          <Float className="bottom-8 right-[5%] hidden w-48 rotate-[7deg] lg:block">
            <p className="font-mono text-[9px] text-[#86868b]">RISK BUDGET</p>
            <p className="mt-1 text-sm font-medium text-white">TE 6% · VaR 95%</p>
            <p className="mt-2 text-[11px] text-[#a1a1a6]">Cash is dry powder, not an afterthought.</p>
          </Float>

          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-[#a1a1a6] backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            <span className="font-mono text-[10px] text-[#2997ff]">NEW</span>
            Institutional KPIs on a virtual book
            <span className="text-white/40">Free →</span>
          </Link>

          <p className="mx-auto mt-10 max-w-lg font-mono text-[11px] uppercase tracking-[0.35em] text-[#86868b]">
            The story of your book
          </p>
          <h1 className="mx-auto mt-4 max-w-5xl font-[Tiny5] text-[clamp(2.4rem,7.5vw,5.8rem)] leading-[0.95] tracking-wide text-white [font-smooth:never] [-webkit-font-smoothing:none]">
            Everything a fund manager knows.
            <span className="mt-2 block bg-gradient-to-r from-[#ff9f0a] via-[#ffd60a] to-[#ff9f0a] bg-clip-text text-transparent">
              Mapped.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-[17px] font-light leading-[1.65] tracking-tight text-[#a1a1a6] md:text-[19px]">
            A black-room terminal for investors who want Bloomberg-grade judgment without the Bloomberg invoice —
            virtual portfolios, research, risk, and backtesting in one continuous narrative.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={signedIn ? "/dashboard" : "/signup"}
              className="rounded-full bg-[#f5f5f7] px-7 py-3 text-[15px] font-medium text-black shadow-[0_0_40px_-8px_rgba(255,255,255,0.5)] transition hover:scale-[1.02] hover:bg-white"
            >
              {signedIn ? "Open terminal →" : "Start managing free →"}
            </Link>
            <a
              href="#story"
              className="rounded-full border border-white/15 px-6 py-3 text-[15px] text-[#f5f5f7] transition hover:border-white/30 hover:bg-white/[0.05]"
            >
              See the story
            </a>
          </div>
          <div className="mx-auto mt-14 flex max-w-3xl flex-wrap justify-center gap-6 font-mono text-[11px] text-[#86868b]">
            <Tape label="SPX" val="279.31" chg="-0.35%" down />
            <Tape label="UST" val="119.91" chg="-0.68%" down />
            <Tape label="VIX" val="12.3" chg="—" />
            <Tape label="GOLD" val="221.92" chg="-0.90%" down />
          </div>
        </section>

        <div className="mt-8 border-y border-white/[0.06] bg-black/40 py-5 backdrop-blur-sm">
          <p className="text-center font-mono text-[10px] tracking-[0.4em] text-[#48484a]">TRUSTED TAPE · FACTOR-CONSISTENT</p>
          <div className="mt-4 overflow-hidden">
            <div className="animate-[marquee_40s_linear_infinite] flex gap-16 whitespace-nowrap px-8 font-mono text-sm text-[#636366]">
              {[...LOGOS, ...LOGOS].map((logo, i) => (
                <span key={`${logo}-${i}`} className="transition hover:text-[#ff9f0a]">{logo}</span>
              ))}
            </div>
          </div>
        </div>

        <section id="story" className="mx-auto max-w-6xl px-5 py-24 md:py-32">
          <p className="text-center font-mono text-[10px] tracking-[0.35em] text-[#ff9f0a]">THREE ACTS</p>
          <h2 className="mt-4 text-center text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-tight text-white">
            From chart watcher to book runner.
          </h2>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {STORY.map((s) => (
              <article
                key={s.act}
                className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-transparent p-8 transition duration-500 hover:border-[#ff9f0a]/30 hover:shadow-[0_0_60px_-20px_rgba(255,159,10,0.25)]"
              >
                <p className="font-[Tiny5] text-3xl text-[#48484a] transition group-hover:text-[#ff9f0a]">{s.act}</p>
                <h3 className="mt-6 text-xl font-semibold leading-snug tracking-tight text-white">{s.title}</h3>
                <p className="mt-4 text-[15px] leading-7 text-[#a1a1a6]">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="paths" className="border-t border-white/[0.06] bg-[#0a0a0a] px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center font-[Tiny5] text-4xl text-white sm:text-5xl md:text-6xl">Choose where to start</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-[15px] text-[#a1a1a6]">
              Same structure as the live terminal — pick a module, open a free account, land on your desk.
            </p>
            <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {PATHS.map((path) => (
                <Link
                  key={path.title}
                  href={path.href}
                  className="group rounded-2xl border border-white/[0.08] bg-[#141414] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-[#1c1c1e] hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)]"
                >
                  <p className="font-[Tiny5] text-2xl text-white">{path.title}</p>
                  <ul className="mt-5 space-y-2 text-sm text-[#a1a1a6]">
                    {path.points.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="text-[#ff9f0a]">·</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 font-mono text-[10px] tracking-wider text-[#636366]">{path.meta}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="box" className="mx-auto max-w-6xl px-5 py-24 md:py-32">
          <h2 className="font-[Tiny5] text-4xl text-white sm:text-5xl">Inside the box</h2>
          <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-16">
            <div className="space-y-5 text-[17px] font-light leading-[1.7] text-[#a1a1a6]">
              <p className="text-white">Not a watchlist. Not paper trading. A desk.</p>
              <p>
                NAV, alpha, Sharpe, Sortino, VaR, tracking error, Brinson — the vocabulary professionals use when capital
                is real. Here it runs on virtual books so you learn the mechanics before the mandate.
              </p>
              <p>Judgment is the product: what the number means, and what you do next.</p>
            </div>
            <ol className="space-y-4 border-l border-[#ff9f0a]/40 pl-6 font-mono text-sm text-[#f5f5f7]">
              <li><span className="text-[#ff9f0a]">01</span> Notes · annotated research</li>
              <li><span className="text-[#ff9f0a]">02</span> Daily tape · macro nowcast</li>
              <li><span className="text-[#ff9f0a]">03</span> Books · three model portfolios</li>
              <li><span className="text-[#ff9f0a]">04</span> Tools · optimizer & scenarios</li>
              <li><span className="text-[#ff9f0a]">05</span> Drills · backtests on the tape</li>
            </ol>
          </div>
        </section>

        <section id="plans" className="border-t border-white/[0.06] bg-[#050505] px-5 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-[Tiny5] text-4xl text-white">Plans</h2>
            <p className="mt-2 text-[#a1a1a6]">Full terminal access. No card. Your book persists in this browser.</p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <Plan title="Free desk" price="$0" copy="Every current module. Virtual books. No card." cta="Create account" href="/signup" featured />
              <Plan title="Analyst" price="$0" copy="Same full access while the platform is in public preview." cta="Start free" href="/signup" />
              <Plan title="Lifetime preview" price="$0" copy="All current tracks and every update in this release." cta="Start free" href="/signup" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-28">
          <h2 className="font-[Tiny5] text-3xl text-white sm:text-4xl">Questions before you join.</h2>
          <div className="mt-8 divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {FAQS.map((item) => (
              <Faq key={item.q} {...item} />
            ))}
          </div>
        </section>

        <section className="border-t border-white/[0.06] px-5 py-24 text-center">
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-white">
            Ready to run the book?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[#a1a1a6]">One account. One terminal. The whole story of modern portfolio management.</p>
          <Link
            href={signedIn ? "/dashboard" : "/signup"}
            className="mt-8 inline-flex rounded-full bg-gradient-to-r from-[#ff9f0a] to-[#ffd60a] px-8 py-3.5 text-[15px] font-semibold text-black transition hover:brightness-110"
          >
            {signedIn ? "Enter MI Terminal" : "Create your free desk"}
          </Link>
        </section>

        <footer className="border-t border-white/[0.06] bg-black px-5 py-14">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:justify-between">
            <div>
              <p className="font-[Tiny5] text-xl text-white">market intelligence</p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#636366]">
                Technical portfolio management through a virtual desk, research tape, and sequenced analytics.
              </p>
            </div>
            <div className="text-sm text-[#a1a1a6]">
              <p className="font-mono text-xs tracking-widest text-[#86868b]">ACCOUNT</p>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/login" className="hover:text-white">Sign in</Link>
                <Link href="/signup" className="hover:text-white">Create account</Link>
                <Link href="/dashboard" className="hover:text-white">Terminal</Link>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-12 max-w-6xl border-t border-white/[0.06] pt-8 text-center font-mono text-[10px] text-[#48484a]">
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
      className={`absolute rounded-2xl border border-white/10 bg-[#1c1c1e]/90 p-4 text-left shadow-[0_24px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl ${className ?? ""}`}
    >
      {children}
    </aside>
  );
}

function Tape({ label, val, chg, down }: { label: string; val: string; chg: string; down?: boolean }) {
  return (
    <span>
      <span className="text-[#636366]">{label}</span>{" "}
      <span className="text-[#f5f5f7]">{val}</span>{" "}
      <span className={down ? "text-[#ff453a]" : "text-[#30d158]"}>{chg}</span>
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
          ? "border-[#ff9f0a]/40 bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0a] shadow-[0_0_50px_-15px_rgba(255,159,10,0.2)]"
          : "border-white/[0.08] bg-[#141414] hover:border-white/15"
      }`}
    >
      <p className="font-[Tiny5] text-2xl text-white">{title}</p>
      <p className="mt-4 font-[Tiny5] text-5xl text-white">{price}</p>
      <p className={`mt-4 text-sm leading-6 ${featured ? "text-[#a1a1a6]" : "text-[#86868b]"}`}>{copy}</p>
      <Link
        href={href}
        className={`mt-8 inline-flex rounded-full px-5 py-2.5 text-sm font-medium transition ${
          featured ? "bg-[#ff9f0a] text-black hover:brightness-110" : "bg-white/10 text-white hover:bg-white/15"
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
        <span className="pr-4 font-[Tiny5] text-lg text-white sm:text-xl">{q}</span>
        <span className="font-mono text-[#636366]">{open ? "−" : "+"}</span>
      </button>
      {open ? <p className="pb-5 text-[15px] leading-7 text-[#a1a1a6]">{a}</p> : null}
    </div>
  );
}
