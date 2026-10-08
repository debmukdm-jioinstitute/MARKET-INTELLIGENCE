"use client";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Check,
  Newspaper,
  ScanLine,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { Milo } from "./Milo";
import type { HomeProgress } from "./useHomeProgress";

/** True while the welcome card (or its celebration) replaces the page header. */
export function welcomeVisible(progress: HomeProgress) {
  const { store, welcomed, today } = progress;
  const celebrate =
    store.badges.includes("first-steps") && !store.firstStepsCelebrated;
  return Boolean(today && (!welcomed || celebrate));
}

export function WelcomeStrip({ progress }: { progress: HomeProgress }) {
  const { store, actions } = progress;
  if (!welcomeVisible(progress)) return null;
  const celebrate =
    store.badges.includes("first-steps") && !store.firstStepsCelebrated;
  if (celebrate)
    return (
      <section
        aria-live="polite"
        className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-[#e9e5fb] p-5 text-stone-900"
      >
        <div className="flex items-center gap-3">
          <Trophy className="size-8 text-[#1a5ce6]" />
          <div>
            <h2 className="font-semibold">
              First Steps unlocked. Nicely done!
            </h2>
            <p className="text-sm text-stone-600">
              +60 XP for exploring your brief, scanner and watchlist.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={actions.dismiss}
          className="rounded-full bg-[#1a5ce6] px-5 py-2 text-sm font-semibold text-white"
        >
          Keep exploring
        </button>
      </section>
    );
  const steps = [
    {
      id: "read-brief" as const,
      title: "Get the big picture",
      desc: "Read today’s 2-minute market brief.",
      cta: "Read the brief",
      href: "/intelligence/brief",
      icon: Newspaper,
      tone: "bg-[#fdea86]",
      run: () => actions.mission("read-brief"),
    },
    {
      id: "run-scan" as const,
      title: "Find an idea",
      desc: "Explore stocks with the scanner.",
      cta: "Try the scanner",
      href: "/intelligence/scanner",
      icon: ScanLine,
      tone: "bg-[#fec7c5]",
      run: () => actions.mission("run-scan"),
    },
    {
      id: "track-stock" as const,
      title: "Make it yours",
      desc: "Add your first stock to a watchlist.",
      cta: "Track a stock",
      href: "/portfolio/watchlist",
      icon: Star,
      tone: "bg-[#b5defd]",
      run: actions.trackStock,
    },
  ];
  const doneCount = steps.filter((s) =>
    store.welcomeSteps.includes(s.id),
  ).length;
  return (
    <section
      aria-labelledby="welcome-title"
      className="relative overflow-hidden rounded-[28px] bg-[#e9e5fb] p-3 text-stone-900 sm:p-5"
    >
      <button
        aria-label="Dismiss welcome"
        type="button"
        onClick={actions.dismiss}
        className="absolute right-3 top-3 z-20 rounded-full p-2 text-stone-700 hover:bg-white/70 sm:right-5 sm:top-5"
      >
        <X className="size-5" />
      </button>

      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-6">
        <div className="px-1 sm:px-3">
          <div className="relative mx-auto max-w-[400px] pt-12 sm:pt-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[4%] bottom-[8%] top-[18%] rounded-[46%_54%_50%_50%/55%_45%_55%_45%] bg-[#cdf26a]"
            />
            <Milo className="relative" />
          </div>
          <h3 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            Meet Milo, your curious market guide.
          </h3>
          <p className="mt-1 text-sm text-stone-600 sm:text-base">
            Our friendly owl helps make market ideas easier to understand, one
            small step at a time.
          </p>
        </div>

        <div className="px-1 pt-2 sm:px-3 lg:pr-12">
          <h2
            id="welcome-title"
            className="pr-10 text-[40px] font-extrabold leading-[0.98] tracking-tight sm:text-6xl lg:text-[64px] xl:text-7xl"
          >
            Big curiosity.
            <br />
            Three small steps.
          </h2>
          <p className="mt-4 max-w-xl text-base text-stone-600 sm:text-lg">
            Welcome to Market Intelligence — your free investing and research
            terminal. A little exploring goes a long way.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <div
              role="img"
              aria-label={`${doneCount} of 3 completed`}
              className="flex items-center"
            >
              {steps.map((s, i) => {
                const done = store.welcomeSteps.includes(s.id);
                return (
                  <span key={s.id} className="flex items-center">
                    {i > 0 ? (
                      <span
                        className={`mx-1 w-6 border-t-2 border-dashed sm:w-8 ${done ? "border-[#1a5ce6]" : "border-[#b9c8f5]"}`}
                      />
                    ) : null}
                    <span
                      className={`grid size-8 place-items-center rounded-full border-2 sm:size-10 ${done ? "border-[#1a5ce6] bg-[#1a5ce6] text-white" : "border-stone-500 bg-transparent"}`}
                    >
                      {done ? <Check className="size-4" /> : null}
                    </span>
                  </span>
                );
              })}
            </div>
            <span className="text-sm text-stone-600 sm:text-base">
              {doneCount} of 3 completed
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#1a5ce6] bg-white/50 px-4 py-2 text-sm font-semibold text-[#1a5ce6] sm:ml-auto">
              <Award className="size-5" />
              First Steps · +60 XP
            </span>
          </div>
        </div>
      </div>

      <ol className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => {
          const done = store.welcomeSteps.includes(s.id);
          return (
            <li key={s.id} className="min-w-0">
              <Link
                prefetch={false}
                href={s.href}
                onClick={s.run}
                className={`group relative block h-full rounded-3xl p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${s.tone}`}
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/85">
                    <s.icon className="size-7" strokeWidth={1.8} />
                  </span>
                  <span className="rounded-lg bg-white/70 px-2 py-1 text-sm font-medium text-stone-600">
                    0{i + 1}
                  </span>
                  <span
                    aria-label={done ? "Completed" : "Not completed"}
                    className={`ml-auto grid size-8 place-items-center rounded-full border-2 ${done ? "border-[#1a5ce6] bg-[#1a5ce6] text-white" : "border-stone-500"}`}
                  >
                    {done ? <Check className="size-4" /> : null}
                  </span>
                </span>
                <span className="mt-4 block text-2xl font-bold tracking-tight">
                  {s.title}
                </span>
                <span className="mt-1 block text-base text-stone-700">
                  {s.desc}
                </span>
                <span className="mt-4 inline-flex items-center gap-2 text-lg font-semibold text-[#1a5ce6]">
                  {s.cta}
                  <ArrowRight className="size-5 transition group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 flex items-center gap-2 border-t border-stone-300/60 px-1 pt-3 text-sm text-stone-600 sm:text-base">
        <Award className="size-5 shrink-0 text-[#7a6bd6]" />
        Complete all three to unlock your First Steps badge.
      </p>
    </section>
  );
}
