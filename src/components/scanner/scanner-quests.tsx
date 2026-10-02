"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "mi-scanner-quests";
const QUEST_TARGET = 3; // distinct scans per day
const XP_PER_SCAN = 10;
const XP_QUEST_BONUS = 25;

interface QuestState {
  xp: number;
  firstScan: boolean;
  streak: number;
  lastScanDay: string | null;
  scansToday: string[];
  questDay: string | null;
}

const EMPTY: QuestState = { xp: 0, firstScan: false, streak: 0, lastScanDay: null, scansToday: [], questDay: null };

function dayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function yesterdayStr(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function load(): QuestState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<QuestState>;
    return {
      xp: typeof p.xp === "number" ? p.xp : 0,
      firstScan: p.firstScan === true,
      streak: typeof p.streak === "number" ? p.streak : 0,
      lastScanDay: typeof p.lastScanDay === "string" ? p.lastScanDay : null,
      scansToday: Array.isArray(p.scansToday) ? p.scansToday.filter((s): s is string => typeof s === "string") : [],
      questDay: typeof p.questDay === "string" ? p.questDay : null,
    };
  } catch {
    return EMPTY;
  }
}

/** Pure transition: returns next state + toast messages to show. */
function applyScan(prev: QuestState, scanId: string): { next: QuestState; toasts: string[] } {
  const today = dayStr();
  const toasts: string[] = [];
  const freshDay = prev.questDay !== today;
  const scansToday = freshDay ? [] : prev.scansToday;
  const isNew = !scansToday.includes(scanId);

  const next: QuestState = {
    ...prev,
    scansToday: isNew ? [...scansToday, scanId] : scansToday,
    questDay: today,
    lastScanDay: today,
    xp: prev.xp + (isNew ? XP_PER_SCAN : 0),
    streak: prev.lastScanDay === today ? prev.streak : prev.lastScanDay === yesterdayStr() ? prev.streak + 1 : 1,
  };

  if (!prev.firstScan) {
    next.firstScan = true;
    toasts.push("🏅 Badge earned: First scan! Keep exploring — each new scan earns XP.");
  }
  if (isNew && next.scansToday.length === QUEST_TARGET) {
    next.xp += XP_QUEST_BONUS;
    toasts.push(`⚡ Daily quest complete: ${QUEST_TARGET} different scans. +${XP_QUEST_BONUS} XP bonus!`);
  }
  if (prev.lastScanDay !== today && next.streak >= 2 && (next.streak === 2 || next.streak % 7 === 0)) {
    toasts.push(`🔥 ${next.streak}-day scan streak! Consistency beats intensity.`);
  }
  return { next, toasts };
}

export function useScannerQuests() {
  const [state, setState] = useState<QuestState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const ref = useRef<QuestState>(EMPTY);
  const idRef = useRef(0);

  useEffect(() => {
    const s = load();
    ref.current = s;
    setState(s);
    setReady(true);
  }, []);

  const pushToast = useCallback((text: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200);
  }, []);

  const recordScan = useCallback(
    (scanId: string) => {
      const { next, toasts } = applyScan(ref.current, scanId);
      ref.current = next;
      setState(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* private mode — quests just won't persist */
      }
      toasts.forEach(pushToast);
    },
    [pushToast],
  );

  return { state, ready, toasts, recordScan };
}

export function QuestToasts({ toasts }: { toasts: { id: number; text: string }[] }) {
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 shadow-lg">
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function ScannerJourney({ state, ready }: { state: QuestState; ready: boolean }) {
  if (!ready) return null;
  const today = dayStr();
  const doneToday = state.questDay === today ? state.scansToday.length : 0;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm font-bold text-foreground">Your scanner journey</p>
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", state.firstScan ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-500")} title={state.firstScan ? "You ran your first scan — nice start." : "Run any scan to earn this badge."}>
        🏅 {state.firstScan ? "First scan" : "First scan — locked"}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800" title="Days in a row you've run at least one scan.">
        🔥 {state.streak}-day streak
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800" title="Earn 10 XP per new scan each day, plus a 25 XP bonus for the daily quest.">
        ⚡ {state.xp} XP
      </span>
      <span className="inline-flex min-w-40 flex-1 items-center gap-2 text-xs font-semibold text-stone-500">
        Today&apos;s quest: {doneToday}/{QUEST_TARGET} scans
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
          <span className="block h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.min(100, (doneToday / QUEST_TARGET) * 100)}%` }} />
        </span>
      </span>
    </div>
  );
}
