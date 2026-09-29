"use client";

import { formatInr, formatPct } from "@/lib/format";
import type { PortfolioAnalysis } from "@/lib/my-portfolio/types";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { useState } from "react";

export function PortfolioSummaryBar({
  data,
  locked,
  onRename,
  onCashChange,
  onSync,
}: {
  data: PortfolioAnalysis;
  locked: boolean;
  onRename: (name: string) => Promise<unknown>;
  onCashChange: (cashInr: number) => Promise<unknown>;
  onSync: () => Promise<unknown>;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(data.settings.name);
  const [cashDraft, setCashDraft] = useState(String(data.settings.cashInr ?? 0));
  const prevNav = data.navInr - data.todayPnlInr;
  const todayPct = prevNav > 0 ? data.todayPnlInr / prevNav : 0;
  const unrealized = data.positions.reduce((s, p) => s + p.pnlInr, 0);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
      <div className="space-y-1">
        {editingName && !locked ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void onRename(nameDraft).then(() => setEditingName(false));
            }}
          >
            <input
              className="rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={60}
            />
            <button type="submit" className="text-sm font-semibold text-blue-600">
              Save
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <p className="font-heading text-lg font-semibold">{data.settings.name}</p>
            {!locked ? (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(data.settings.name);
                  setEditingName(true);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Rename portfolio"
              >
                <Pencil className="size-3.5" />
              </button>
            ) : null}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          NAV {formatInr(data.navInr)}
          {(data.settings.cashInr ?? 0) > 0 ? ` · incl. ${formatInr(data.settings.cashInr ?? 0)} cash` : null}
        </p>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Today</p>
          <p className={cn("font-semibold tabular-nums", data.todayPnlInr >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {formatInr(data.todayPnlInr)} ({formatPct(todayPct)})
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Unrealized</p>
          <p className={cn("font-semibold tabular-nums", unrealized >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {formatInr(unrealized)}
          </p>
        </div>
        {!locked ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="cash-inr">
              Cash (INR)
            </label>
            <form
              className="flex gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                void onCashChange(Number(cashDraft) || 0);
              }}
            >
              <input
                id="cash-inr"
                type="number"
                min={0}
                className="w-28 rounded-md border border-border bg-background px-2 py-1 tabular-nums"
                value={cashDraft}
                onChange={(e) => setCashDraft(e.target.value)}
              />
              <button type="submit" className="text-sm font-semibold text-blue-600">
                Set
              </button>
            </form>
          </div>
        ) : null}
        {!locked ? (
          <button
            type="button"
            onClick={() => void onSync()}
            className="self-end text-sm font-semibold text-blue-600 hover:underline"
          >
            Sync account
          </button>
        ) : null}
      </div>
    </div>
  );
}
