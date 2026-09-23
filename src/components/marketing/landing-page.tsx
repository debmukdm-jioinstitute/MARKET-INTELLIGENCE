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
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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
  { value: "15+", label: "portfolio metrics" },
  { value: "200+", label: "NSE & US stocks covered" },
  { value: "Live", label: "market data" },
  { value: "$0", label: "to get started" },
];

const FAQS = [
  {
    q: "Is this real trading?",
    a: "No. Market Intelligence is a virtual portfolio tool. Nothing here touches real money, so you can learn and experiment freely.",
  },
  {
    q: "Do I need a credit card?",
    a: "No. Create an account with just an email and password. It's free to start, no card required.",
  },
  {
    q: "What can I actually do here?",
    a: "Track a portfolio, research stocks, check your risk, view live market data, and run backtests — all in one simple dashboard.",
  },
  {
    q: "Who is this for?",
    a: "Anyone who wants to understand their money better — students, new investors, and experienced traders who want cleaner tools.",
  },
];

export function LandingPage() {
  const { user, ready, enterGuest, isGuest } = useAuth();
  const hasAccess = ready && Boolean(user);

  return (
    <div className="marketing relative min-h-screen overflow-x-hidden bg-[#f6f8fc] text-gray-900 selection:bg-blue-600/20">
      {/* Ambient background blobs for the glass effect */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 left-[8%] h-[420px] w-[420px] rounded-full bg-blue-400/25 blur-[110px]" />
        <div className="absolute top-40 right-[5%] h-[380px] w-[380px] rounded-full bg-sky-300/25 blur-[110px]" />
        <div className="absolute bottom-0 left-[30%] h-[360px] w-[360px] rounded-full bg-violet-300/20 blur-[110px]" />
      </div>

      <div className="relative z-10">
        <div className="border-b border-white/60 bg-white/50 py-2.5 text-center backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">
            Free during preview — no credit card needed.{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:underline underline-offset-4">
              Start free →
            </Link>
          </p>
        </div>

        <header className="sticky top-0 z-30 border-b border-white/50 bg-white/60 backdrop-blur-2xl backdrop-saturate-150">
          <div className="mx-auto flex h-[52px] max-w-6xl items-center justify-between gap-2 px-4 sm:px-5">
            <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-blue-600 text-sm font-medium text-white shadow-[var(--shadow-sm)]">
                mi
              </span>
              <span className="hidden whitespace-nowrap text-[17px] font-semibold tracking-tight text-gray-900 sm:inline">market intelligence</span>
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
        <section className="relative px-5 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-1.5 text-sm text-muted-foreground shadow-[var(--shadow-sm)] backdrop-blur-md">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live market data, free to start
            </span>

            <h1 className="mx-auto mt-6 max-w-2xl text-[clamp(2.2rem,6vw,3.8rem)] font-semibold leading-[1.08] tracking-tight text-gray-900">
              Manage money like a pro.
              <span className="block bg-gradient-to-r from-blue-600 via-sky-500 to-violet-500 bg-clip-text text-transparent">
                Without the Bloomberg bill.
              </span>
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
          <div className="relative mx-auto mt-16 max-w-4xl [perspective:1600px]">
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
                <MockStat label="Total value" value="₹29.15 L" trend="+4.13%" up />
                <MockStat label="Today's P&L" value="+₹12,825" trend="+0.61%" up />
                <MockStat label="Sharpe ratio" value="1.24" trend="steady" />
                <MockStat label="Value at risk" value="₹41,574" trend="-0.87%" />
              </div>
              <div className="mt-4 h-28 rounded-2xl border border-white/60 bg-gradient-to-b from-blue-50/80 to-white/40 sm:h-36" />
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

        {/* STATS STRIP */}
        <section className="mx-auto mt-20 max-w-5xl px-5">
          <div className="grid grid-cols-2 gap-4 rounded-3xl border border-white/70 bg-white/50 p-6 shadow-[var(--shadow-sm)] backdrop-blur-xl sm:grid-cols-4 sm:p-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-semibold text-gray-900 sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="mx-auto max-w-6xl px-5 py-24 md:py-32">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-sm font-semibold tracking-[0.2em] text-blue-600 uppercase">Everything in one place</p>
            <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.75rem)] font-semibold tracking-tight text-gray-900">
              The tools professionals use. Made simple.
            </h2>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-3xl border border-white/70 bg-white/50 p-7 shadow-[var(--shadow-sm)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/70 hover:shadow-[var(--shadow-lg)]"
              >
                <div className="grid size-11 place-items-center rounded-2xl bg-blue-600/10 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-gray-900">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-7 text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="border-y border-white/60 bg-white/40 px-5 py-24 backdrop-blur-xl md:py-28">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-sm font-semibold tracking-[0.2em] text-blue-600 uppercase">Get started in minutes</p>
              <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.75rem)] font-semibold tracking-tight text-gray-900">
                Three steps. That's it.
              </h2>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="rounded-3xl border border-white/70 bg-white/60 p-7 text-center shadow-[var(--shadow-sm)] backdrop-blur-xl"
                >
                  <div className="mx-auto grid size-10 place-items-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-[var(--shadow-sm)]">
                    {s.n}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link
                href={hasAccess ? "/Home" : "/signup"}
                className="inline-flex rounded-full bg-blue-600 px-7 py-3 text-[15px] font-medium text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition hover:scale-[1.03] hover:bg-blue-600/90"
              >
                {hasAccess ? "Open terminal →" : "Start free →"}
              </Link>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="mx-auto max-w-3xl px-5 py-24 md:py-28">
          <div className="rounded-3xl border border-white/70 bg-white/50 p-8 text-center shadow-[var(--shadow-lg)] backdrop-blur-2xl sm:p-12">
            <p className="text-sm font-semibold tracking-[0.2em] text-blue-600 uppercase">Simple pricing</p>
            <p className="mt-4 text-5xl font-semibold tracking-tight text-gray-900">Free</p>
            <p className="mt-2 text-muted-foreground">Every feature. No credit card. No time limit.</p>
            <ul className="mx-auto mt-8 flex max-w-sm flex-col gap-3 text-left text-sm text-gray-700">
              {[
                "Unlimited virtual portfolios",
                "Live market data & research",
                "Risk and performance analytics",
                "Backtesting and scenarios",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="size-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={hasAccess ? "/Home" : "/signup"}
              className="mt-8 inline-flex rounded-full bg-blue-600 px-8 py-3 text-[15px] font-medium text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.5)] transition hover:scale-[1.03] hover:bg-blue-600/90"
            >
              {hasAccess ? "Open terminal →" : "Sign up for free →"}
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-2xl px-5 pb-28">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Questions? Answered.
          </h2>
          <div className="mt-10 flex flex-col gap-3">
            {FAQS.map((item) => (
              <Faq key={item.q} {...item} />
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-5 pb-28">
          <div className="mx-auto max-w-4xl rounded-3xl border border-white/70 bg-gradient-to-br from-blue-600 to-violet-600 px-8 py-16 text-center shadow-[0_30px_80px_-20px_rgba(37,99,235,0.45)] sm:px-16">
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-tight text-white">
              Your money deserves better tools.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-blue-100">
              Join for free and see your portfolio the way professionals do.
            </p>
            <Link
              href={hasAccess ? "/Home" : "/signup"}
              className="mt-8 inline-flex rounded-full bg-white px-8 py-3.5 text-[15px] font-semibold text-blue-700 shadow-[var(--shadow-md)] transition hover:scale-[1.03] hover:bg-blue-50"
            >
              {hasAccess ? "Open terminal →" : "Sign up for free, takes 2 minutes →"}
            </Link>
          </div>
        </section>

        <footer className="border-t border-white/60 bg-white/40 px-5 py-14 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:justify-between">
            <div>
              <p className="text-xl font-semibold text-gray-900">market intelligence</p>
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
            © Market Intelligence · Simulated data · Not investment advice
          </p>
        </footer>
      </div>
    </div>
  );
}

function MockStat({ label, value, trend, up }: { label: string; value: string; trend: string; up?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/60 p-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900 sm:text-base">{value}</p>
      <p className={`mt-0.5 text-[11px] ${up ? "text-emerald-600" : "text-muted-foreground"}`}>{trend}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-white/70 bg-white/50 px-5 backdrop-blur-xl transition hover:bg-white/70">
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
