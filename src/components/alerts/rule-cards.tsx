"use client";

import { BellRing, Clock, Mail, Pause, Play, Trash2, Undo2 } from "lucide-react";
import { useRef, useState } from "react";
import { condListText, type MetricInfo, type Rule } from "./model";

type Props = {
  rules: Rule[];
  labelOf: (id: string) => MetricInfo | undefined;
  onToggle: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** Re-create a rule that was just deleted (for undo). */
  onRestore: (r: Rule) => Promise<void>;
};

function relTime(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "less than an hour ago";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export function RuleCards({ rules, labelOf, onToggle, onDelete, onRestore }: Props) {
  const [deleted, setDeleted] = useState<Rule | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  async function remove(r: Rule) {
    if (timer.current) window.clearTimeout(timer.current);
    setDeleted(r);
    setBusy(r.id);
    try {
      await onDelete(r.id);
    } finally {
      setBusy(null);
      timer.current = window.setTimeout(() => setDeleted(null), 9000);
    }
  }

  async function undo() {
    if (!deleted) return;
    if (timer.current) window.clearTimeout(timer.current);
    const r = deleted;
    setDeleted(null);
    setBusy(r.id);
    try {
      await onRestore(r);
    } finally {
      setBusy(null);
    }
  }

  if (!rules.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-semibold text-foreground">No rules yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Pick a template above and you'll have your first watcher in under a minute. Rules are checked every 3 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {rules.map((r) => (
          <div
            key={r.id}
            className={`rounded-xl border bg-card p-4 shadow-sm transition-opacity ${r.active ? "border-border" : "border-border/60 opacity-75"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{r.name}</p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  r.active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                }`}
              >
                {r.active ? "● Watching" : "○ Paused"}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{condListText(r.conditions, r.combinator, labelOf)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                {r.channels.includes("push") ? <BellRing className="size-3.5" /> : null}
                {r.channels.includes("email") ? <Mail className="size-3.5" /> : null}
                {r.channels.join(" + ")}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> quiet {r.cooldownHours}h after firing
              </span>
              <span>{r.lastFiredAt ? `last fired ${relTime(r.lastFiredAt) ?? ""}` : "never fired"}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3">
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => onToggle(r.id, !r.active)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {r.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {r.active ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                aria-label={`Delete rule ${r.name}`}
                disabled={busy === r.id}
                onClick={() => remove(r)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {deleted ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 shadow-md">
          <p className="text-sm text-foreground">
            Deleted <span className="font-semibold">“{deleted.name}”</span>. You have a few seconds to change your mind.
          </p>
          <button
            type="button"
            onClick={undo}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white"
          >
            <Undo2 className="size-4" /> Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
