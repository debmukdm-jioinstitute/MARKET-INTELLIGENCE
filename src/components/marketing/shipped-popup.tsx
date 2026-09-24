"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Bump this id when there is a new "what we shipped" note, so returning visitors see it once. */
const NOTE_ID = "mi.shipped.2026-09-25";

const SHIPPED: { emoji: string; title: string; text: string; href?: string; cta?: string }[] = [
  {
    emoji: "🔔",
    title: "The bell (top right)",
    text: "Every meaningful change across markets, macro, scanners and AI signals lands there, with a link to the page that explains it. Mute what you don't care about, and get a device alert only for the big stuff. No more missing the one metric that mattered.",
  },
  {
    emoji: "📡",
    title: "Nifty 500 Stock Scanner",
    text: "27 scans on every Nifty 500 stock: 52-week breakouts, VCP setups, golden crosses, double bottoms, oversold dips and more. Refreshed after every close.",
    href: "/intelligence/scanner",
    cta: "Open scanner",
  },
  {
    emoji: "🧪",
    title: "Backtests that don't lie",
    text: "Every scanner replayed over two years, no peeking at the future, compared against the average stock. Spoiler: most of them don't beat it. We show you anyway. 😅 (One setup did survive a proper out-of-sample test. Go see which.)",
    href: "/intelligence/backtesting",
    cta: "See the receipts",
  },
  {
    emoji: "🤖",
    title: "AI Signals, with the report card attached",
    text: "A Nifty next-session model that shows its own track record right next to the prediction. Today it's basically a coin flip, and I'd rather tell you that than sell you a fake “92% confidence” gauge.",
    href: "/intelligence/ai-signals",
    cta: "Check the model",
  },
  {
    emoji: "🏦",
    title: "CMIE Prowess data on stock pages",
    text: "Reported financials, balance sheets, cash flows and ratios from India's most trusted corporate database, now rolling onto stock pages. First batch of Nifty 500 names is live, more landing as we go.",
    href: "/research",
    cta: "Try a stock",
  },
  {
    emoji: "🌡️",
    title: "Macro stress index, transmission map & scenarios",
    text: "See when stress builds across volatility, currency, rates, liquidity and flows, how a shock travels through the market, and what a scenario does to you. Backtested against forward Nifty returns.",
    href: "/macro/stress",
    cta: "Open stress index",
  },
  {
    emoji: "🏛️",
    title: "Real RBI liquidity, yield curve & FX reserves",
    text: "Placeholders are gone. Live numbers, a Data Health page showing how fresh every feed is, and collectors that refresh every 3 hours.",
    href: "/data/health",
    cta: "Data health",
  },
  {
    emoji: "📰",
    title: "A Daily Brief that cites its sources",
    text: "Pre-market and post-close briefs grounded in real data (not vibes), opt-in email delivery, and your own alert rules like “VIX above 20 and FII selling”.",
    href: "/intelligence/brief",
    cta: "Read today's brief",
  },
  {
    emoji: "🧭",
    title: "Find anything, trust everything",
    text: "⌘K command palette with live metrics, a guided tour, an ⓘ on every number showing where it comes from, and a risk & events card on every stock page.",
  },
  {
    emoji: "🔌",
    title: "Plug us into your AI assistant",
    text: "A read-only MCP endpoint with 10 tools over the site's analytics. Ask your own assistant about the numbers you see here.",
  },
];

/** "What all we shipped in the last 2 days" — a one-time pop-up on the Home page, in the founder-note design language. */
export function ShippedPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    try {
      if (localStorage.getItem(NOTE_ID)) return;
    } catch {
      return; // storage blocked: never nag
    }
    // Wait for the guided-tour prompt (first-time visitors) to be dealt with before showing this one.
    const tryOpen = () => {
      if (cancelled) return;
      let tourPending = false;
      try {
        tourPending = !localStorage.getItem("hasSeenTour");
      } catch {
        /* ignore */
      }
      if (tourPending) timer = setTimeout(tryOpen, 1000);
      else timer = setTimeout(() => !cancelled && setOpen(true), 700);
    };
    timer = setTimeout(tryOpen, 1800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(NOTE_ID, "1");
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="What all we shipped in the last 2 days"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto overflow-x-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-blue-50 via-white to-white p-6 shadow-2xl sm:p-10"
          >
            <div className="pointer-events-none absolute -left-24 -top-24 h-[280px] w-[280px] rounded-full bg-blue-500/15 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-[280px] w-[280px] rounded-full bg-cyan-400/15 blur-[80px]" />

            <button type="button" onClick={close} aria-label="Close" className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600">
              <X className="size-5" />
            </button>

            <div className="relative z-[1]">
              <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full bg-blue-100 text-3xl shadow-sm">🚀</div>
              <h2 className="text-center text-[clamp(1.5rem,4vw,2.25rem)] font-semibold tracking-tight text-gray-900">What all we shipped in the last 2 days</h2>

              <div className="mx-auto mt-8 max-w-2xl space-y-5 text-[16px] leading-relaxed text-gray-700">
                <p>Hey there,</p>
                <p>
                  Two days. A lot of chai. Very little sleep. ☕🔥 I said I'd build the market tool I always wished existed, and I'm not slowing down. Here's everything that went live since you were last here. No fluff, just the receipts. 🧾
                </p>

                <ul className="space-y-3">
                  {SHIPPED.map((s) => (
                    <li key={s.title} className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm">
                      <p className="font-semibold text-gray-900">
                        <span className="mr-2">{s.emoji}</span>
                        {s.title}
                      </p>
                      <p className="mt-1 text-[15px] text-gray-600">{s.text}</p>
                      {s.href ? (
                        <Link href={s.href} onClick={close} className="mt-2 inline-block text-sm font-semibold text-blue-600 hover:underline">
                          {s.cta} →
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>

                <p>
                  Here's the honest part. I'm building this out of Room 507 at Jio Institute, and every time someone opens a tab, sends me a bug, or tells me “I wish it did X”, it makes the whole thing better. You being here this early genuinely means the world to me. 🙏
                </p>
                <p>
                  Something broken, confusing, or missing? Tell me. The best ideas so far came from you, and I read every single email:{" "}
                  <a href="mailto:Deb@getmarketintelligence.in" className="font-semibold text-blue-600 hover:underline">
                    Deb@getmarketintelligence.in
                  </a>
                  . Let's keep building. 💪🌟
                </p>

                <div className="pt-2">
                  <p className="font-medium text-gray-900">Warmly,</p>
                  <img src="/founder.png" alt="Debabrata Mukherjee" className="mt-4 h-20 w-auto object-contain" />
                  <button type="button" onClick={close} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/25 active:scale-[0.98]">
                    Let's go 🚀
                  </button>
                  <p className="mt-6 border-t border-gray-200/60 pt-5 text-sm italic text-muted-foreground">Made with ❤️ by Debabrata Mukherjee from Jio Institute, Room no 507</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
