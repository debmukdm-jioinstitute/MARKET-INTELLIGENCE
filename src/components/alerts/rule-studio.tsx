"use client";

import { BellRing, CheckCircle2, CircleDashed, MinusCircle, Plus, XCircle } from "lucide-react";
import { useState } from "react";
import {
  MAX_CONDITIONS,
  MAX_COOLDOWN,
  MIN_COOLDOWN,
  OPS,
  condSentence,
  draftSentence,
  draftWouldFire,
  evalCond,
  fmtNum,
  type Cond,
  type Draft,
  type MetricInfo,
} from "./model";

const inputCls =
  "rounded-lg border border-border bg-background px-2.5 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none";

type Props = {
  draft: Draft;
  onDraft: (d: Draft) => void;
  catalog: MetricInfo[];
  /** Create the rule. Returns an error message, or null on success. */
  onCreate: (d: Draft) => Promise<string | null>;
  canEdit: boolean;
};

export function RuleStudio({ draft, onDraft, catalog, onCreate, canEdit }: Props) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const labelOf = (id: string) => catalog.find((m) => m.id === id);

  const setConds = (conds: Cond[]) => onDraft({ ...draft, conditions: conds });

  async function create() {
    if (!canEdit) return;
    setErr(null);
    setBusy(true);
    try {
      const problem = await onCreate(draft);
      if (problem) setErr(problem);
    } finally {
      setBusy(false);
    }
  }

  const wouldFire = draftWouldFire(draft, labelOf);

  return (
    <div className="space-y-4">
      {/* Live plain-English preview */}
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">What this rule says</p>
        <p className="mt-1 text-base font-semibold text-foreground">{draftSentence(draft, labelOf)}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {draft.channels.length === 0
            ? "Pick at least one way to reach you below."
            : `We'll ${draft.channels.includes("push") ? "send a push notification" : ""}${draft.channels.includes("push") && draft.channels.includes("email") ? " and " : ""}${draft.channels.includes("email") ? "email you" : ""} when it fires, then wait ${draft.cooldownHours}h before alerting again.`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {wouldFire === true ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
              <CheckCircle2 className="size-3.5" /> This rule would fire right now.
            </span>
          ) : wouldFire === false ? (
            <span className="inline-flex items-center gap-1.5">
              <CircleDashed className="size-3.5" /> Not firing right now — it waits quietly until conditions are met.
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <CircleDashed className="size-3.5" /> Some metrics have no current reading yet.
            </span>
          )}
        </p>
      </div>

      {/* Conditions */}
      <div className="space-y-2.5">
        {draft.conditions.map((c, i) => {
          const m = labelOf(c.metric);
          const current = m?.current;
          const firing = evalCond(c, current);
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
              <select
                className={`${inputCls} min-w-44 flex-1 md:flex-none md:w-56`}
                value={c.metric}
                aria-label="Metric"
                onChange={(e) => setConds(draft.conditions.map((x, j) => (j === i ? { ...x, metric: e.target.value } : x)))}
              >
                {catalog.map((mi) => (
                  <option key={mi.id} value={mi.id}>
                    {mi.label} ({mi.unit})
                  </option>
                ))}
              </select>
              <select
                className={inputCls}
                value={c.op}
                aria-label="Operator"
                onChange={(e) => setConds(draft.conditions.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)))}
              >
                {OPS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <input
                className={`${inputCls} w-28 tabular-nums`}
                type="number"
                step="any"
                aria-label="Threshold value"
                value={c.value}
                onChange={(e) => setConds(draft.conditions.map((x, j) => (j === i ? { ...x, value: Number(e.target.value) } : x)))}
              />
              <span className="text-xs text-muted-foreground" title="Latest reading from our data providers">
                now: {current != null && Number.isFinite(current) ? <span className="tabular-nums font-semibold text-foreground">{fmtNum(current)}</span> : "n/a"}
              </span>
              {firing === true ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  <CheckCircle2 className="size-3" /> firing now
                </span>
              ) : firing === false ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <XCircle className="size-3" /> not firing
                </span>
              ) : null}
              {draft.conditions.length > 1 ? (
                <button
                  type="button"
                  aria-label="Remove condition"
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
                  onClick={() => setConds(draft.conditions.filter((_, j) => j !== i))}
                >
                  <MinusCircle className="size-3.5" /> Remove
                </button>
              ) : null}
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-3">
          {draft.conditions.length < MAX_CONDITIONS ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary"
              onClick={() => setConds([...draft.conditions, { metric: "fii_net", op: "<", value: -2000 }])}
            >
              <Plus className="size-4" /> Add condition ({draft.conditions.length}/{MAX_CONDITIONS})
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">Up to {MAX_CONDITIONS} conditions per rule.</p>
          )}
          {draft.conditions.length > 1 ? (
            <div className="inline-flex rounded-lg border border-border p-0.5 text-sm" role="group" aria-label="Condition logic">
              {(["all", "any"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onDraft({ ...draft, combinator: v })}
                  className={`rounded-md px-3 py-1.5 font-medium ${draft.combinator === v ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {v === "all" ? "ALL must match" : "ANY can match"}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Name, channels, cooldown */}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-foreground">Rule name</label>
          <input
            className={`${inputCls} w-full`}
            placeholder="e.g. VIX spike — auto-named if blank"
            value={draft.name}
            onChange={(e) => onDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-semibold text-foreground">How should we reach you?</span>
          <div className="flex gap-2">
            {(["push", "email"] as const).map((ch) => {
              const on = draft.channels.includes(ch);
              return (
                <button
                  key={ch}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onDraft({ ...draft, channels: on ? draft.channels.filter((x) => x !== ch) : [...draft.channels, ch] })}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BellRing className="size-4" />
                  {ch === "push" ? "Push" : "Email"}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          After firing, stay quiet for
          <input
            className={`${inputCls} w-20 tabular-nums`}
            type="number"
            min={MIN_COOLDOWN}
            max={MAX_COOLDOWN}
            value={draft.cooldownHours}
            onChange={(e) => onDraft({ ...draft, cooldownHours: Math.max(MIN_COOLDOWN, Math.min(MAX_COOLDOWN, Number(e.target.value) || MIN_COOLDOWN)) })}
          />
          hours <span className="text-xs">(1–168)</span>
        </label>
        <button
          type="button"
          disabled={busy || !draft.channels.length || !canEdit}
          onClick={create}
          className="ml-auto rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-px disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create rule"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Plain words for each line: {draft.conditions.map((c, i) => (
          <span key={i}>
            {i > 0 ? (draft.combinator === "all" ? " and " : " or ") : ""}
            <span className="font-medium text-foreground">{condSentence(c, labelOf)}</span>
          </span>
        ))}
      </p>
      {err ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{err}</p> : null}
    </div>
  );
}
