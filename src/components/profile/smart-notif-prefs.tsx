"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Prefs = {
  frequency: "all" | "important" | "digest";
  muted_categories: string[];
  quiet_start: number;
  quiet_end: number;
  max_push_per_day: number;
};

const DEFAULTS: Prefs = { frequency: "important", muted_categories: [], quiet_start: 22, quiet_end: 8, max_push_per_day: 3 };

const CATS: { id: string; label: string }[] = [
  { id: "market", label: "Markets" },
  { id: "macro", label: "Macro" },
  { id: "broker", label: "Broker intel" },
  { id: "promoter", label: "Promoters" },
  { id: "credit", label: "Credit risk" },
  { id: "funds", label: "Mutual funds" },
  { id: "scanner", label: "Scanner" },
  { id: "ai", label: "AI & retail" },
];

const FREQS: { id: Prefs["frequency"]; label: string; desc: string }[] = [
  { id: "all", label: "Everything", desc: "Every detected event, ranked." },
  { id: "important", label: "Important only", desc: "Critical and noteworthy events. Recommended." },
  { id: "digest", label: "Digest only", desc: "No pushes — morning and evening summaries." },
];

/** Smart notification preferences — frequency, muted categories, push budget. Saves to /api/notifications/smart-prefs. */
export function SmartNotifPrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications/smart-prefs", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.prefs) {
          setPrefs({ ...DEFAULTS, ...j.prefs });
          setLoaded(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async (next: Prefs) => {
    setPrefs(next);
    setSaving(true);
    setNote("");
    try {
      const r = await fetch("/api/notifications/smart-prefs", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next),
      });
      setNote(r.ok ? "Saved." : "Couldn't save — try again.");
    } catch {
      setNote("Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleCat = (id: string) => {
    const muted = prefs.muted_categories.includes(id)
      ? prefs.muted_categories.filter((c) => c !== id)
      : [...prefs.muted_categories, id];
    void save({ ...prefs, muted_categories: muted });
  };

  if (!loaded) return <p className="text-sm text-muted-foreground">Loading notification preferences…</p>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-foreground">How much should we tell you?</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {FREQS.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={saving}
              onClick={() => void save({ ...prefs, frequency: f.id })}
              className={cn(
                "rounded-xl border p-3 text-left transition disabled:opacity-50",
                prefs.frequency === f.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
              )}
            >
              <p className="text-sm font-semibold">{f.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Topics</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Untick anything you never want to hear about.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATS.map((c) => {
            const on = !prefs.muted_categories.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${c.label} notifications`}
                disabled={saving}
                onClick={() => toggleCat(c.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50",
                  on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground line-through",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">Max device alerts per day</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Critical pushes only. Quiet hours are 10pm–8am IST.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button" disabled={saving || prefs.max_push_per_day <= 0}
            onClick={() => void save({ ...prefs, max_push_per_day: prefs.max_push_per_day - 1 })}
            className="size-8 rounded-full border border-border p-2 -m-2 text-lg leading-none hover:bg-accent disabled:opacity-40" aria-label="Fewer alerts"
          >−</button>
          <span className="w-6 text-center text-sm font-semibold">{prefs.max_push_per_day}</span>
          <button
            type="button" disabled={saving || prefs.max_push_per_day >= 10}
            onClick={() => void save({ ...prefs, max_push_per_day: prefs.max_push_per_day + 1 })}
            className="size-8 rounded-full border border-border p-2 -m-2 text-lg leading-none hover:bg-accent disabled:opacity-40" aria-label="More alerts"
          >+</button>
        </div>
      </div>
      {note ? <p className="text-xs text-muted-foreground" role="status">{note}</p> : null}
    </div>
  );
}
