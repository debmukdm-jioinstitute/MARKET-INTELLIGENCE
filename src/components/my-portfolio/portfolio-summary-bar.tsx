"use client";

import { VerifyAtSourceLink } from "@/components/ui/verify-at-source-link";
import { formatInr, formatPct } from "@/lib/format";
import { formatAsOfIst } from "@/lib/provenance";
import type { PortfolioAnalysis } from "@/lib/my-portfolio/types";
import { cn } from "@/lib/utils";
import { Pencil, RefreshCw, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

const LIVE_MARKS_SOURCE = {
  href: "https://www.nseindia.com/market-data/live-equity-market",
  label: "NSE live marks",
};

function StatChip({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "up" | "down" | "neutral";
}) {
  return (
    <div className="min-w-[8.5rem] flex-1 rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5 sm:flex-none">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-base font-bold tabular-nums leading-tight",
          tone === "up" && "text-emerald-600 dark:text-emerald-400",
          tone === "down" && "text-rose-600 dark:text-rose-400",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{sub}</p> : null}
    </div>
  );
}

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
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!editingName) setNameDraft(data.settings.name);
  }, [data.settings.name, editingName]);

  useEffect(() => {
    setCashDraft(String(data.settings.cashInr ?? 0));
  }, [data.settings.cashInr]);

  const prevNav = data.navInr - data.todayPnlInr;
  const todayPct = prevNav > 0 ? data.todayPnlInr / prevNav : 0;
  const unrealized = data.positions.reduce((s, p) => s + p.pnlInr, 0);
  const marksAsOf = formatAsOfIst(data.fetchedAt);

  const todayTone = data.todayPnlInr > 0 ? "up" : data.todayPnlInr < 0 ? "down" : "neutral";
  const unrealizedTone = unrealized > 0 ? "up" : unrealized < 0 ? "down" : "neutral";

  return (
    <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          {editingName && !locked ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void onRename(nameDraft).then(() => setEditingName(false));
              }}
            >
              <input
                className="min-w-[12rem] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={60}
                autoFocus
              />
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600/90"
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
                onClick={() => {
                  setNameDraft(data.settings.name);
                  setEditingName(false);
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-start gap-2">
              <h2 className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {data.settings.name}
              </h2>
              {!locked ? (
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(data.settings.name);
                    setEditingName(true);
                  }}
                  className="mt-1 rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  aria-label="Rename portfolio"
                >
                  <Pencil className="size-3.5" />
                </button>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-sm text-muted-foreground">
              NAV{" "}
              <span className="text-base font-bold tabular-nums text-foreground">{formatInr(data.navInr)}</span>
            </p>
            {(data.settings.cashInr ?? 0) > 0 ? (
              <p className="text-xs text-muted-foreground">includes {formatInr(data.settings.cashInr ?? 0)} cash</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {marksAsOf ? <span>Marks as of {marksAsOf} IST</span> : null}
            <VerifyAtSourceLink {...LIVE_MARKS_SOURCE} className="text-[11px]" />
          </div>
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto lg:max-w-md lg:justify-end">
          <StatChip
            label="Today"
            value={formatInr(data.todayPnlInr)}
            sub={formatPct(todayPct)}
            tone={todayTone}
          />
          <StatChip label="Unrealized" value={formatInr(unrealized)} tone={unrealizedTone} />
        </div>
      </div>

      {!locked ? (
        <div className="flex flex-col gap-3 border-t border-border/50 bg-muted/15 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void onCashChange(Number(cashDraft) || 0);
            }}
          >
            <div className="space-y-1">
              <label
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                htmlFor="cash-inr"
              >
                <Wallet className="size-3" aria-hidden />
                Cash (INR)
              </label>
              <div className="flex gap-2">
                <input
                  id="cash-inr"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  className="w-32 rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums"
                  value={cashDraft}
                  onChange={(e) => setCashDraft(e.target.value)}
                />
                <button
                  type="submit"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
                >
                  Update
                </button>
              </div>
            </div>
            <p className="pb-2 text-[11px] text-muted-foreground sm:max-w-[14rem]">
              Idle cash rolls into NAV and allocation weights.
            </p>
          </form>

          <button
            type="button"
            disabled={syncing}
            onClick={() => {
              setSyncing(true);
              void onSync().finally(() => setSyncing(false));
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60 sm:self-center"
          >
            <RefreshCw className={cn("size-4", syncing && "animate-spin")} aria-hidden />
            {syncing ? "Syncing…" : "Sync account"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
