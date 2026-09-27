"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Bump this id when there is a new "what we shipped" note, so returning visitors see it once. */
const NOTE_ID = "mi.shipped.2026-09-27";

const SHIPPED: { emoji: string; title: string; text: string; href?: string; cta?: string }[] = [
  {
    emoji: "📊",
    title: "Portfolio benchmarks that match the index",
    text: "Pick Nifty 50, Bank, IT, Midcap 150, Sensex, or US indices. Brinson sector attribution and active share now use live NSE constituent lists (refreshed daily), not a Nifty 50 proxy for every benchmark.",
    href: "/portfolio/attribution",
    cta: "See attribution",
  },
  {
    emoji: "🏠",
    title: "Home board: five AI agents + portal map",
    text: "New Home hub — five agent cards (navigate, research, trade, portfolio, macro) plus an Explore section with deep links into every major area. Less hunting, more doing.",
    href: "/Home",
    cta: "Open Home",
  },
  {
    emoji: "💬",
    title: "Ask Deb — site assistant",
    text: "Floating AI on every portal page: jump to a route, search pages, open the command palette. Grounded in this site's nav and tools, not generic chat fluff.",
    href: "/help",
    cta: "How to use it",
  },
  {
    emoji: "🧭",
    title: "Wayfinding everywhere",
    text: "Back link, breadcrumbs, and sibling tabs on portal pages so you always know where you are and what's next (Attribution, Risk, Optimizer, etc.).",
    href: "/portfolio",
    cta: "Portfolio hub",
  },
  {
    emoji: "📱",
    title: "Mobile bottom tabs → real landing pages",
    text: "Today, Invest, Trade, Portfolio, Tools now go straight to each section's home — not a drawer that hides the destination.",
  },
  {
    emoji: "📈",
    title: "Nifty hero chart when Upstox is quiet",
    text: "India cockpit Nifty chart falls back to Yahoo candles when the primary feed is empty (weekends, closed market). Fewer “no data” dead screens.",
    href: "/Home",
    cta: "Cockpit",
  },
  {
    emoji: "🛡️",
    title: "Portfolio crash fixes",
    text: "Fixed attribution blowing up on full index constituent lists, stopped portfolio API from blocking on slow NSE refresh, and added proper error screens instead of a black “page couldn't load”.",
    href: "/portfolio/risk",
    cta: "Risk desk",
  },
  {
    emoji: "⚙️",
    title: "Admin: benchmark constituent job",
    text: "System & Jobs can run the NSE index weight refresh on demand (same job as the daily cron). Warm the cache after deploys.",
    href: "/admin/system",
    cta: "Admin jobs",
  },
  {
    emoji: "✨",
    title: "Motion & scroll polish",
    text: "Smoother page transitions on desktop, safer document scroll on mobile (no stuck scroll), staggered card motion on Home — reduced motion still respected.",
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
                  Another two-day sprint. ☕🔥 Portfolio math got honest, Home got a map, mobile got less annoying. Here's what landed since the last note — receipts only. 🧾
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
