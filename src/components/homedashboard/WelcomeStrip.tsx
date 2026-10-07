"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Newspaper,
  ScanLine,
  Star,
  Trophy,
  X,
} from "lucide-react";
import type { HomeProgress } from "./useHomeProgress";

export function WelcomeStrip({ progress }: { progress: HomeProgress }) {
  const { store, actions, welcomed, today } = progress;
  const celebrate =
    store.badges.includes("first-steps") && !store.firstStepsCelebrated;
  if (!today || (welcomed && !celebrate)) return null;
  if (celebrate)
    return (
      <section
        aria-live="polite"
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-5 text-stone-900"
      >
        <div className="flex items-center gap-3">
          <Trophy className="size-8 text-teal-600" />
          <div>
            <h2 className="font-semibold">
              First Steps unlocked. Nicely done!
            </h2>
            <p className="text-sm text-[#5f6368]">
              +60 XP for exploring your brief, scanner and watchlist.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={actions.dismiss}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Keep exploring
        </button>
      </section>
    );
  const steps = [
    {
      id: "read-brief" as const,
      label: "Read today’s 2-minute brief",
      href: "/intelligence/brief",
      icon: Newspaper,
      run: () => actions.mission("read-brief"),
    },
    {
      id: "run-scan" as const,
      label: "Run the stock scanner",
      href: "/intelligence/scanner",
      icon: ScanLine,
      run: () => actions.mission("run-scan"),
    },
    {
      id: "track-stock" as const,
      label: "Track your first stock",
      href: "/portfolio/watchlist",
      icon: Star,
      run: actions.trackStock,
    },
  ];
  return (
    <section className="relative rounded-2xl border border-teal-200 bg-teal-50/70 p-5 sm:p-6">
      <button
        aria-label="Dismiss welcome"
        type="button"
        onClick={actions.dismiss}
        className="absolute right-3 top-3 rounded-lg p-2 text-[#5f6368] hover:bg-white"
      >
        <X className="size-4" />
      </button>
      <h2 className="pr-8 max-w-2xl text-xl font-semibold tracking-tight text-stone-900">
        Welcome to Market Intelligence — your free investing terminal.
      </h2>
      <p className="mt-2 text-sm text-[#5f6368]">
        Three small steps. A clearer view of the market. Complete them to unlock
        First Steps +60 XP.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => {
          const done = store.welcomeSteps.includes(s.id);
          return (
            <Link
              prefetch={false}
              key={s.id}
              href={s.href}
              onClick={s.run}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-teal-100 bg-white p-3 text-sm font-medium text-stone-900 transition hover:border-teal-400"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600">
                {done ? (
                  <Check className="size-4" />
                ) : (
                  <s.icon className="size-4" />
                )}
              </span>
              <span className="flex-1">
                {i + 1}. {s.label}
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-teal-600" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
