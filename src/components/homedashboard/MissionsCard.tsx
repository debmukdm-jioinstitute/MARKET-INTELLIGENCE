"use client";
import Link from "next/link";
import { Check, Flame, ArrowUpRight, Trophy } from "lucide-react";
import {
  computeStreak,
  levelForXP,
  missionsOn,
} from "@/lib/gamification/missions";
import type { HomeProgress } from "./useHomeProgress";
import { cardClass, SectionHeading } from "./shared";

const missions = [
  {
    id: "read-brief" as const,
    title: "Read today’s brief",
    detail: "Get the story behind the session",
    href: "/intelligence/brief",
  },
  {
    id: "run-scan" as const,
    title: "Run the stock scanner",
    detail: "Discover a new name to research",
    href: "/intelligence/scanner",
  },
  {
    id: "open-debate" as const,
    title: "Open an AI Desk debate",
    detail: "Hear the bull case and the bear case",
    href: "/research/ai-desk",
  },
];
const badges: Record<string, string> = {
  "first-steps": "First Steps",
  "streak-7": "Seven-day streak",
  "paper-trader": "Paper Trader",
  debater: "Debater",
};
export function MissionsCard({
  progress,
  now,
}: {
  progress: HomeProgress;
  now: Date | null;
}) {
  const { store, today, actions } = progress;
  const done = missionsOn(store, today);
  const streak = now ? computeStreak(store, now) : 0;
  const level = levelForXP(store.xp);
  const percent = level.next
    ? ((store.xp - level.min) / (level.next - level.min)) * 100
    : 100;
  return (
    <section aria-label="Daily Missions">
      <SectionHeading
        title="Today’s missions"
        detail="Three useful stops. One step a day keeps your streak going."
      />
      <div className={cardClass}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1 sm:max-w-sm">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-stone-900">
                {level.name}
              </span>
              <span className="text-xs font-medium text-stone-500">
                {store.xp} XP
                {level.next
                  ? ` · ${level.next - store.xp} to next level`
                  : " · highest level"}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Experience toward next level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
              className="h-1.5 overflow-hidden rounded-full bg-stone-100"
            >
              <div
                className="h-full rounded-full bg-teal-600 transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-600">
            <Flame className="size-4" />
            {streak}-day streak
          </span>
        </div>
        <div className="divide-y divide-stone-100">
          {missions.map((m) => {
            const checked = done.includes(m.id);
            return (
              <Link
                prefetch={false}
                key={m.id}
                href={m.href}
                onClick={() => actions.mission(m.id)}
                aria-label={`${m.title}, ${checked ? "completed" : "earn 20 XP"}`}
                className="group flex items-center gap-3 rounded-lg py-4 hover:bg-stone-50"
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded border ${checked ? "border-teal-600 bg-teal-600 text-white" : "border-stone-300 bg-white"}`}
                  aria-hidden
                >
                  {checked ? <Check className="size-3.5" /> : null}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-900">
                    {m.title}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {checked ? "Done for today. See you tomorrow." : m.detail}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold ${checked ? "text-teal-600" : "text-stone-500"}`}
                >
                  {checked ? "Complete" : "+20 XP"}
                </span>
                <ArrowUpRight className="size-4 text-stone-400" />
              </Link>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-stone-500" aria-live="polite">
          {done.length === 3
            ? "Come back tomorrow to keep your streak."
            : `${done.length} of 3 completed · resets at midnight IST · +10 XP for your daily visit.`}
        </p>
        {store.badges.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {store.badges
              .filter((b) => badges[b])
              .map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-600"
                >
                  <Trophy className="size-3" />
                  {badges[b]}
                </span>
              ))}
          </div>
        ) : null}
        <p className="mt-3 text-[10px] text-stone-500">
          Homepage XP is earned when you open a tool and stays in this browser.
          Account XP is tracked separately on your profile.
        </p>
      </div>
    </section>
  );
}
