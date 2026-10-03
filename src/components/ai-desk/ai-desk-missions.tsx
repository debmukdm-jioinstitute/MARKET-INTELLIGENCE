"use client";

import { Check, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { awardXp } from "@/lib/gamification/client";

export type MissionId = "ask" | "watch";

const STORAGE_KEY = "mi-ai-desk-missions-v1";

export const MISSION_DEFS: { id: MissionId; title: string; hint: string; xp: number }[] = [
  { id: "ask", title: "Ask your first question", hint: "Run a debate on any stock", xp: 20 },
  { id: "watch", title: "Watch a full debate", hint: "Read every round down to the final call", xp: 30 },
];

type Stored = { xp: number; done: Record<MissionId, boolean> };

function readStored(): Stored {
  const fallback: Stored = { xp: 0, done: { ask: false, watch: false } };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      xp: typeof parsed.xp === "number" ? parsed.xp : 0,
      done: {
        ask: parsed.done?.ask === true,
        watch: parsed.done?.watch === true,
      },
    };
  } catch {
    return fallback;
  }
}

function writeStored(next: Stored) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

export type XpToast = { id: number; title: string; xp: number } | null;

/**
 * Local-only missions + XP for the AI Desk. No backend, no auth — pure localStorage.
 */
export function useAiDeskMissions() {
  const { user, isGuest, ready } = useAuth();
  const signedIn = ready && !!user && !isGuest;
  const [stored, setStored] = useState<Stored>(readStored);
  const [toast, setToast] = useState<XpToast>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const completeMission = useCallback((id: MissionId) => {
    const current = readStored();
    if (current.done[id]) return;
    const def = MISSION_DEFS.find((m) => m.id === id);
    if (!def) return;
    const next: Stored = { xp: current.xp + def.xp, done: { ...current.done, [id]: true } };
    writeStored(next);
    setStored(next);
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), title: def.title, xp: def.xp });
    timer.current = setTimeout(() => setToast(null), 3200);
    // Mirror the local award on the server for signed-in users (guests: 401, ignored).
    if (signedIn) void awardXp(id === "ask" ? "first_debate_asked" : "debate_completed", "ai-desk");
  }, [signedIn]);

  return { xp: stored.xp, done: stored.done, toast, completeMission };
}

export function MissionStrip({ xp, done }: { xp: number; done: Record<MissionId, boolean> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
        <Sparkles className="size-3.5" />
        {xp} XP
      </span>
      {MISSION_DEFS.map((m) => (
        <span
          key={m.id}
          title={m.hint}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
            done[m.id]
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-stone-200 bg-white text-stone-500",
          )}
        >
          {done[m.id] ? <Check className="size-3.5" /> : <span className="size-3.5 rounded-full border border-current" />}
          {m.title}
          <span className="text-xs opacity-70">+{m.xp}</span>
        </span>
      ))}
    </div>
  );
}

export function XpToastCard({ toast }: { toast: NonNullable<XpToast> }) {
  return (
    <div
      key={toast.id}
      role="status"
      className="ai-desk-toast pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2"
    >
      <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-white px-4 py-3 shadow-xl shadow-amber-100/60">
        <span className="flex size-9 items-center justify-center rounded-full bg-amber-100">
          <Sparkles className="size-4 text-amber-700" />
        </span>
        <div>
          <p className="text-sm font-semibold text-stone-900">Mission complete: {toast.title}</p>
          <p className="text-sm text-amber-700">+{toast.xp} XP earned</p>
        </div>
      </div>
    </div>
  );
}
