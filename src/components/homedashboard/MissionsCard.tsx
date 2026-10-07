"use client";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  FileText,
  Flame,
  MessageCircle,
  Search,
} from "lucide-react";
import {
  computeStreak,
  levelForXP,
  missionsOn,
  type MissionId,
} from "@/lib/gamification/missions";
import type { HomeProgress } from "./useHomeProgress";

const missions: {
  id: MissionId;
  title: string;
  detail: string;
  href: string;
  iconClass: string;
  tileClass: string;
  Icon: typeof FileText;
}[] = [
  {
    id: "read-brief",
    title: "Read today’s brief",
    detail: "Get the story behind the session",
    href: "/intelligence/brief",
    iconClass: "text-blue-600",
    tileClass: "bg-blue-50",
    Icon: FileText,
  },
  {
    id: "run-scan",
    title: "Run the stock scanner",
    detail: "Discover a new name to research",
    href: "/intelligence/scanner",
    iconClass: "text-purple-600",
    tileClass: "bg-purple-50",
    Icon: Search,
  },
  {
    id: "open-debate",
    title: "Open an AI Desk debate",
    detail: "Hear the bull case and the bear case",
    href: "/research/ai-desk",
    iconClass: "text-gray-500",
    tileClass: "bg-gray-100",
    Icon: MessageCircle,
  },
];

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
    <section aria-label="Daily missions">
      <div className="rounded-[20px] border border-gray-200 bg-white p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span
              className="grid size-14 shrink-0 place-items-center rounded-2xl bg-blue-100"
              aria-hidden
            >
              <span className="grid size-8 place-items-center rounded-lg bg-blue-600">
                <Check className="size-5 text-white" strokeWidth={3} />
              </span>
            </span>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                Today’s missions
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Three useful stops. One step a day keeps your streak going.
              </p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-500">
            <Flame
              className="size-5 fill-orange-500 text-orange-500"
              aria-hidden
            />
            {streak}-day streak
            <ChevronRight className="size-4" aria-hidden />
          </span>
        </div>

        <div className="mt-7 flex items-center gap-5">
          <div className="shrink-0">
            <p className="text-base font-bold text-gray-900">{level.name}</p>
            <p className="mt-0.5 text-[13px] text-gray-500">
              {store.xp} XP
              {level.next
                ? ` · ${level.next - store.xp} to next level`
                : " · highest level"}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Experience toward next level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100"
          >
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="w-12 shrink-0 text-right text-base font-bold text-gray-900">
            {Math.round(percent)}%
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {missions.map((m) => {
            const checked = done.includes(m.id);
            const Icon = m.Icon;
            return (
              <Link
                prefetch={false}
                key={m.id}
                href={m.href}
                onClick={() => actions.mission(m.id)}
                aria-label={`${m.title}, ${checked ? "completed" : "earn 20 XP"}`}
                className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 transition-colors hover:bg-gray-50 sm:px-5"
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-md border-2 ${
                    checked
                      ? "border-blue-600 bg-blue-600"
                      : "border-gray-200 bg-white"
                  }`}
                  aria-hidden
                >
                  {checked ? (
                    <Check className="size-4 text-white" strokeWidth={3.5} />
                  ) : null}
                </span>
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-xl ${m.tileClass}`}
                  aria-hidden
                >
                  <Icon className={`size-6 ${m.iconClass}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-gray-900">
                    {m.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-gray-500">
                    {checked ? "Done for today. See you tomorrow." : m.detail}
                  </span>
                </span>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold ${
                    checked
                      ? "bg-gray-100 text-gray-500"
                      : "bg-blue-50 text-blue-600"
                  }`}
                >
                  {checked ? "Completed" : "+20 XP"}
                </span>
                <ChevronRight
                  className="size-5 shrink-0 text-gray-400"
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>

        <p className="mt-5 text-sm" aria-live="polite">
          <span className="font-semibold text-gray-900">
            {done.length} of 3 completed
          </span>
          <span className="text-gray-400"> · </span>
          {done.length === 3 ? (
            <span className="text-gray-500">
              Come back tomorrow to keep your streak.
            </span>
          ) : (
            <span className="text-gray-500">
              Resets at midnight IST
              <span className="text-gray-400"> · </span>
              +10 XP for your daily visit
            </span>
          )}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
          Homepage XP is earned when you open a tool and stays in this browser.
          Account XP is tracked separately on your profile.
        </p>
      </div>
    </section>
  );
}
