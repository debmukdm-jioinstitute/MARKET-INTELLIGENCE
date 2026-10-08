"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart2,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  Download,
  FileText,
  HelpCircle,
  Layers,
  MoreHorizontal,
  Pencil,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import type {
  Holding,
  MetricCategory,
  MetricResult,
  PortfolioAnalysis,
  PositionRow,
  RegressionInputs,
} from "@/lib/my-portfolio/types";
import { BENCHMARK_OPTIONS, type BenchmarkId, BENCHMARK_LABEL } from "@/lib/my-portfolio/benchmark-options";
import { moneyWeightedIrr } from "@/lib/my-portfolio/metrics-spec-engine";
import { GLOSSARY } from "@/lib/my-portfolio/glossary";
import { AddHoldingDialog } from "@/components/my-portfolio/add-holding-dialog";
import { BrokerImportDialog } from "@/components/my-portfolio/broker-import-dialog";
import { EditHoldingDialog } from "@/components/my-portfolio/edit-holding-dialog";
import { SellHoldingDialog } from "@/components/my-portfolio/sell-holding-dialog";
import { HoldingsList } from "@/components/my-portfolio/holdings-list";
import { MetricEyeButton, MetricExplainProvider } from "@/components/my-portfolio/metric-explain-dialog";
import { MetricsBento } from "@/components/my-portfolio/metrics-bento";
import { exportHoldingsCsv } from "@/lib/my-portfolio/india-tax-estimate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Format Indian Currency: ₹8,62,335
function formatInr(val: number, options?: { showSign?: boolean; decimals?: number }): string {
  if (!Number.isFinite(val)) return "—";
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString("en-IN", {
    minimumFractionDigits: options?.decimals ?? 0,
    maximumFractionDigits: options?.decimals ?? 0,
  });
  if (val < 0) return `−₹${formatted}`;
  if (options?.showSign && val > 0) return `+₹${formatted}`;
  return `₹${formatted}`;
}

// Format Percent: -17.36%
function formatPct(val: number | null | undefined, options?: { showSign?: boolean; decimals?: number }): string {
  if (val == null || !Number.isFinite(val)) return "—";
  const abs = Math.abs(val * 100);
  const dec = options?.decimals ?? 2;
  const str = abs.toFixed(dec);
  if (val < 0) return `−${str}%`;
  if (options?.showSign && val > 0) return `+${str}%`;
  return `${str}%`;
}

// Find metric by ID in categories
function findMetric(categories: MetricCategory[] | undefined, id: string): MetricResult | null {
  if (!categories) return null;
  for (const cat of categories) {
    const found = cat.metrics.find((m) => m.id === id);
    if (found) return found;
  }
  return null;
}

export type CashFlowEntry = {
  id: string;
  date: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amountInr: number;
  note?: string;
};

interface PortfolioDashboardViewProps {
  data: PortfolioAnalysis | null;
  locked?: boolean;
  onAddHolding: (holding: any) => Promise<unknown>;
  onRemoveHolding: (id: string) => void;
  onClearHoldings: () => void;
  onImportHoldings: (holdings: Holding[], mode: "replace" | "append") => Promise<unknown>;
  onUpdateBenchmark: (id: BenchmarkId) => Promise<unknown>;
  onEditHolding: (id: string, patch: { shares: number; avgCost: number }) => Promise<unknown>;
  onSellHolding: (id: string, input: { shares: number; price: number; tradeDate?: string }) => Promise<unknown>;
  onUpdateName: (name: string) => Promise<unknown>;
  onUpdateCash: (cash: number) => Promise<unknown>;
}

export function PortfolioDashboardView({
  data,
  locked: _locked = false,
  onAddHolding,
  onRemoveHolding,
  onClearHoldings,
  onImportHoldings,
  onUpdateBenchmark,
  onEditHolding,
  onSellHolding,
  onUpdateName,
  onUpdateCash,
}: PortfolioDashboardViewProps) {
  // UI states
  const [showHoldingsDrawer, setShowHoldingsDrawer] = useState(false);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [showCashFlowDialog, setShowCashFlowDialog] = useState(false);
  const [showGlossaryDialog, setShowGlossaryDialog] = useState(false);
  const [glossarySearch, setGlossarySearch] = useState("");
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [portfolioName, setPortfolioName] = useState(data?.settings.name ?? "My virtual portfolio");
  const [cashInputValue, setCashInputValue] = useState(data?.cashInr ? String(data.cashInr) : "0");
  const [isDeeperOpen, setIsDeeperOpen] = useState(false);
  const [holdingsSearch, setHoldingsSearch] = useState("");
  const [holdingsSort, setHoldingsSort] = useState<"weight" | "pnl" | "name">("weight");
  const [editRow, setEditRow] = useState<PositionRow | null>(null);
  const [sellRow, setSellRow] = useState<PositionRow | null>(null);

  // Cash flows state (persisted in local storage or memory)
  const [cashFlows, setCashFlows] = useState<CashFlowEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem("mi_portfolio_cash_flows_v1");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [cfDate, setCfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cfType, setCfType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [cfAmount, setCfAmount] = useState("");

  const saveCashFlows = (next: CashFlowEntry[]) => {
    setCashFlows(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("mi_portfolio_cash_flows_v1", JSON.stringify(next));
      } catch {}
    }
  };

  const handleAddCashFlow = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cfAmount);
    if (!amount || amount <= 0) return;
    const entry: CashFlowEntry = {
      id: "cf-" + Date.now(),
      date: cfDate,
      type: cfType,
      amountInr: amount,
    };
    saveCashFlows([...cashFlows, entry]);
    setCfAmount("");
  };

  const handleDeleteCashFlow = (id: string) => {
    saveCashFlows(cashFlows.filter((c) => c.id !== id));
  };

  // Calculations
  const positions = useMemo(() => data?.positions ?? [], [data?.positions]);
  const holdingsCount = positions.length;
  const navInr = data?.navInr ?? 0;
  const cashInr = data?.cashInr ?? 0;
  const todayPnlInr = data?.todayPnlInr ?? 0;
  const todayPct = navInr > 0 ? (todayPnlInr / navInr) * 100 : 0;

  // Unrealized P&L
  const unrealizedPnlInr = useMemo(() => {
    return positions.reduce((sum, p) => sum + p.pnlInr, 0);
  }, [positions]);

  const totalCostBasisInr = useMemo(() => {
    return positions.reduce((sum, p) => {
      const cost = p.shares * p.avgCost;
      const rate = p.currency === "USD" && p.last > 0 ? p.lastInr / p.last : 1;
      return sum + cost * rate;
    }, 0);
  }, [positions]);

  const yourReturnFraction = totalCostBasisInr > 0 ? unrealizedPnlInr / totalCostBasisInr : 0;

  // Benchmark Return & Metrics
  const currentBenchmark = data?.settings.benchmark ?? "NIFTY50";
  const benchmarkLabel = BENCHMARK_LABEL[currentBenchmark] ?? "NIFTY 50";

  const benchmarkReturnMetric = useMemo(() => {
    return data?.overview?.find((m) => m.id === "benchmarkReturn") ?? findMetric(data?.categories, "benchmarkReturn");
  }, [data]);

  // Both returns cover the same window (first to last NAV date) so the comparison is like for like.
  const periodReturnMetric = useMemo(() => findMetric(data?.categories, "absoluteReturn"), [data]);
  const yourReturn = periodReturnMetric?.status === "na" ? null : (periodReturnMetric?.value ?? null);
  const benchReturn = benchmarkReturnMetric?.status === "na" ? null : (benchmarkReturnMetric?.value ?? null);
  const periodStart = data?.navSeries?.[0]?.date;
  const periodEnd = data?.navSeries?.[data.navSeries.length - 1]?.date;

  const diffPoints = yourReturn != null && benchReturn != null ? Math.abs((yourReturn - benchReturn) * 100).toFixed(2) : null;
  const isBehind = yourReturn != null && benchReturn != null && yourReturn < benchReturn;

  // Volatility & Max Drawdown
  const volMetric = useMemo(() => findMetric(data?.categories, "volatility"), [data]);
  const volDisplay = volMetric?.value != null ? `${(volMetric.value * 100).toFixed(1)}%` : "—";

  const mddMetric = useMemo(() => findMetric(data?.categories, "maxDrawdown"), [data]);
  const mddDisplay = mddMetric?.value != null ? formatPct(mddMetric.value) : "—";

  // Active Share
  const activeShareMetric = useMemo(() => findMetric(data?.categories, "activeShare"), [data]);
  const activeShareDisplay = activeShareMetric?.value != null ? `${Math.round(activeShareMetric.value * 100)}%` : "—";

  // IRR & XIRR
  // XIRR from the dated cash flows the user entered: deposits are outflows, withdrawals inflows,
  // and today's portfolio value is the terminal inflow. Needs at least one flow older than today.
  const xirr = useMemo(() => {
    if (!cashFlows.length || navInr <= 0) return null;
    const sorted = [...cashFlows].sort((a, b) => a.date.localeCompare(b.date));
    const t0 = new Date(sorted[0]!.date).getTime();
    const day = 24 * 3600 * 1000;
    const terminalDays = (Date.now() - t0) / day;
    if (!(terminalDays >= 1)) return null;
    const flows = sorted.map((c) => ({
      amount: c.type === "DEPOSIT" ? -c.amountInr : c.amountInr,
      days: (new Date(c.date).getTime() - t0) / day,
    }));
    return moneyWeightedIrr(flows, navInr, terminalDays);
  }, [cashFlows, navInr]);
  const xirrDisplay = xirr != null && Number.isFinite(xirr) ? formatPct(xirr) : "—";

  const irrMetric = useMemo(() => findMetric(data?.categories, "mwrIrr"), [data]);
  const irrDisplay = irrMetric?.value != null ? formatPct(irrMetric.value) : "—";

  // Filtered & sorted positions for drawer
  const filteredPositions = useMemo(() => {
    let list = [...positions];
    if (holdingsSearch.trim()) {
      const q = holdingsSearch.toLowerCase();
      list = list.filter((p) => p.symbol.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
    }
    if (holdingsSort === "weight") {
      list.sort((a, b) => b.weight - a.weight);
    } else if (holdingsSort === "pnl") {
      list.sort((a, b) => b.pnlInr - a.pnlInr);
    } else if (holdingsSort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [positions, holdingsSearch, holdingsSort]);

  // Handle cash update
  const handleSaveCash = () => {
    const val = parseFloat(cashInputValue);
    if (!Number.isNaN(val) && val >= 0) {
      void onUpdateCash(val);
      setShowCashDialog(false);
    }
  };

  // Handle rename
  const handleSaveName = () => {
    if (portfolioName.trim()) {
      void onUpdateName(portfolioName.trim());
      setShowRenameDialog(false);
    }
  };

  return (
    <MetricExplainProvider value={{ benchmark: benchmarkLabel, regression: data?.regression }}>
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* 1. Brand & Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-black text-white font-extrabold text-xs shadow-xs">
            Mi
          </div>
          <span className="text-sm font-semibold text-stone-900 tracking-tight">Market intelligence</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
                {data?.settings.name || "My virtual portfolio"}
              </h1>
              <span className="inline-flex items-center rounded-full border border-stone-200 bg-white/90 px-3 py-0.5 text-xs font-semibold text-stone-600 shadow-2xs">
                Virtual money
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-stone-500 font-normal">
              Try investing. Learn as you go.
            </p>
          </div>

          {/* Action Buttons Top Right */}
          <div className="flex items-center gap-2">
            <BrokerImportDialog
              onImport={onImportHoldings}
              triggerLabel="Import"
            />

            <AddHoldingDialog
              onAdd={onAddHolding}
              triggerLabel="Add holding"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-2xs transition-colors hover:bg-stone-50"
                  aria-label="More portfolio options"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg">
                <DropdownMenuItem
                  onClick={() => setShowRenameDialog(true)}
                  className="rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Pencil className="mr-2 size-3.5 text-stone-500" />
                  Rename portfolio
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => positions.length && exportHoldingsCsv(positions)}
                  disabled={!positions.length}
                  className="rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Download className="mr-2 size-3.5 text-stone-500" />
                  Export holdings to CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => onClearHoldings()}
                  disabled={!positions.length}
                  className="rounded-lg text-xs font-semibold text-rose-600 focus:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="mr-2 size-3.5 text-rose-600" />
                  Clear book
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Subheader Controls */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowHoldingsDrawer(true)}
            className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            {holdingsCount} holdings
          </button>
          <span className="text-stone-300 font-light">|</span>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-500 font-medium">
            <span>Compare with</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1 text-xs font-bold text-stone-800 shadow-2xs transition-colors hover:bg-stone-50"
                >
                  <span>{benchmarkLabel}</span>
                  <ChevronDown className="size-3 text-stone-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl p-1.5 shadow-lg">
                <div className="px-2 py-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  India Indices
                </div>
                {BENCHMARK_OPTIONS.filter((b) => b.region === "IN").map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => void onUpdateBenchmark(b.id)}
                    className="flex items-center justify-between rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <span>{b.label}</span>
                    {currentBenchmark === b.id && <Check className="size-3.5 text-blue-600" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="my-1" />
                <div className="px-2 py-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  US Indices
                </div>
                {BENCHMARK_OPTIONS.filter((b) => b.region === "US").map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    onClick={() => void onUpdateBenchmark(b.id)}
                    className="flex items-center justify-between rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <span>{b.label}</span>
                    {currentBenchmark === b.id && <Check className="size-3.5 text-blue-600" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 2. Top Grid: Two Major Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Your portfolio today */}
        <div className="flex flex-col justify-between rounded-3xl border border-[#DCFCE7] bg-[#F0FDF4] p-6 shadow-xs">
          <div>
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-emerald-100/60 bg-white text-stone-800 shadow-2xs">
                <BarChart2 className="size-5 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-stone-900">
                  Your portfolio today
                </h2>
                <p className="text-xs sm:text-[13px] text-stone-500 font-normal">
                  The current value of your virtual investments.
                </p>
              </div>
            </div>

            {/* Big Value */}
            <p className="my-4 text-[34px] sm:text-[40px] font-extrabold tracking-tight text-stone-900 tabular-nums">
              {formatInr(navInr)}
            </p>

            {/* Divided KPI row */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-white/70 border border-emerald-100/40 p-4">
              <div className="border-r border-stone-200/60 pr-2">
                <div className="flex items-center gap-1 text-xs font-medium text-stone-500">
                  <span>Today</span>
                  <MetricInfoTrigger term="Today's change" text="Mark-to-market gain or loss recorded across your holdings during today's trading session." />
                </div>
                <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-stone-900 tabular-nums">
                  {formatInr(todayPnlInr, { showSign: true })}
                </p>
                <p className="mt-1 text-xs font-medium text-stone-500">
                  {`${todayPct.toFixed(2)}% · ${todayPct > 0 ? "Up today" : todayPct < 0 ? "Down today" : "Unchanged"}`}
                </p>
              </div>

              <div className="pl-2">
                <div className="flex items-center gap-1 text-xs font-medium text-stone-500">
                  <span>{unrealizedPnlInr >= 0 ? "Unrealized gain" : "Unrealized loss"}</span>
                  <MetricInfoTrigger term="Unrealized P&L" text="Total profit or loss on current holdings that you have not yet sold, compared to your average cost." />
                </div>
                <p
                  className={cn(
                    "mt-1 text-xl sm:text-2xl font-bold tracking-tight tabular-nums",
                    unrealizedPnlInr < 0 ? "text-[#E11D48]" : unrealizedPnlInr > 0 ? "text-emerald-600" : "text-stone-900",
                  )}
                >
                  {formatInr(unrealizedPnlInr)}
                </p>
                <p className="mt-1 text-xs font-medium text-stone-500">
                  {unrealizedPnlInr >= 0 ? "Gain on holdings you have not sold." : "Loss on holdings you have not sold."}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Virtual Cash Strip */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-stone-200/60 bg-white/95 px-4 py-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-stone-700">
              <Wallet className="size-4 text-stone-800" />
              <span>Virtual cash</span>
              <MetricInfoTrigger term="Virtual cash" text="Unallocated cash in your portfolio book. Included in total portfolio value." />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm sm:text-base font-bold text-stone-900 tabular-nums">
                {formatInr(cashInr)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCashInputValue(String(cashInr));
                  setShowCashDialog(true);
                }}
                className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                <Pencil className="size-3.5" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: You vs the market */}
        <div className="flex flex-col justify-between rounded-3xl border border-[#FFE2D6] bg-[#FFF6F2] p-6 shadow-xs">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-orange-100/60 bg-white text-stone-800 shadow-2xs">
                  <TrendingUp className="size-5 stroke-[2]" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold tracking-tight text-stone-900">
                    You vs the market
                  </h2>
                  <p className="text-xs sm:text-[13px] text-stone-500 font-normal">
                    {periodStart && periodEnd ? `Over the same period · ${periodStart} to ${periodEnd}` : "Over the same period."}
                  </p>
                </div>
              </div>

              {/* Compare with Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold text-stone-800 shadow-2xs transition-colors hover:bg-white"
                  >
                    <span className="text-stone-500 font-normal">Compare with</span>
                    <span className="font-bold">{benchmarkLabel}</span>
                    <ChevronDown className="size-3 text-stone-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-lg">
                  {BENCHMARK_OPTIONS.map((b) => (
                    <DropdownMenuItem
                      key={b.id}
                      onClick={() => void onUpdateBenchmark(b.id)}
                      className="flex items-center justify-between rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <span>{b.label}</span>
                      {currentBenchmark === b.id && <Check className="size-3.5 text-blue-600" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Comparison Grid */}
            <div className="mt-4 grid grid-cols-2 gap-4 rounded-2xl bg-white/80 border border-orange-100/50 p-4 text-center">
              <div>
                <p className="text-xs font-medium text-stone-500">Your return</p>
                <p className={cn(
                  "mt-1 text-2xl sm:text-[28px] font-bold tabular-nums",
                  yourReturn == null ? "text-stone-300" : yourReturn < 0 ? "text-[#E11D48]" : "text-emerald-600",
                )}>
                  {yourReturn != null ? formatPct(yourReturn) : "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-stone-500">{benchmarkLabel}</p>
                <p className={cn(
                  "mt-1 text-2xl sm:text-[28px] font-bold tabular-nums",
                  benchReturn == null ? "text-stone-300" : benchReturn < 0 ? "text-[#E11D48]" : "text-emerald-600",
                )}>
                  {benchReturn != null ? formatPct(benchReturn) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Key Insight Card */}
          <div className="mt-4 flex items-center gap-3.5 rounded-2xl border border-stone-200/60 bg-white p-3.5 px-4 shadow-2xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-stone-200/80 bg-stone-50 text-stone-800">
              <Target className="size-4.5 stroke-[2]" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Key insight
              </p>
              <p className="text-sm sm:text-base font-bold text-stone-900">
                {diffPoints != null
                  ? `${diffPoints} percentage points ${isBehind ? "behind" : "ahead of"} ${benchmarkLabel}.`
                  : "Needs more price history to compare."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Grid: Time / Period Returns & Cash Flow */}
      <div className="space-y-3">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card 3: Your money, over time */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#DBEAFF] bg-[#F0F7FF] p-6 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-blue-100/60 bg-white text-stone-800 shadow-2xs">
                <BarChart3 className="size-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-stone-900">
                  Your money, over time
                </h3>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-1 text-xs font-bold text-stone-700">
                <span>XIRR</span>
                <span className="text-stone-400 font-normal">›</span>
                <MetricInfoTrigger term="XIRR" text="Extended Internal Rate of Return: Annualized compound rate of return that accounts for the exact dates and amounts of every cash inflow and outflow." />
              </div>
              <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-stone-900">
                {xirrDisplay}
              </p>
              <p className="mt-2 text-xs font-medium text-stone-600">
                Annualized return using the dates money goes in or out.
              </p>
              <p className="mt-0.5 text-[11px] text-stone-400">
                {xirr == null ? "Add dated cash flows to calculate." : `From ${cashFlows.length} cash flow${cashFlows.length === 1 ? "" : "s"} you entered plus today's value.`}
              </p>
            </div>
          </div>

          {/* Card 4: Your money, each period */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#EBE6FC] bg-[#F7F5FE] p-6 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-purple-100/60 bg-white text-stone-800 shadow-2xs">
                <Calendar className="size-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-stone-900">
                  Your money, each period
                </h3>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-1 text-xs font-bold text-stone-700">
                <span>IRR</span>
                <MetricInfoTrigger term="IRR" text="Internal Rate of Return: The periodic rate of return that makes the net present value of all equally spaced cash flows equal to zero." />
              </div>
              <p className="mt-1 text-2xl sm:text-3xl font-extrabold text-stone-900">
                {irrDisplay !== "—" ? irrDisplay : "—"}
              </p>
              <p className="mt-2 text-xs font-medium text-stone-600">
                Return per period when cash flows are equally spaced.
              </p>
              <p className="mt-0.5 text-[11px] text-stone-400">
                Add periodic cash flows to calculate.
              </p>
            </div>
          </div>
        </div>

        {/* Cash Flow Banner */}
        <button
          type="button"
          onClick={() => setShowCashFlowDialog(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-blue-200/60 bg-[#EAF4FD] py-3 px-4 text-xs sm:text-sm font-semibold text-blue-600 transition-colors hover:bg-[#DEEFFC] cursor-pointer shadow-2xs"
        >
          <FileText className="size-4" />
          <span>Add cash-flow history →</span>
        </button>
      </div>

      {/* 4. Lower Grid: Risk & Mix */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 5: How bumpy was the ride? */}
        <div className="flex flex-col justify-between rounded-3xl border border-[#FEF3C7] bg-[#FFFDF0] p-6 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-100/60 bg-white text-stone-800 shadow-2xs">
              <Activity className="size-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-stone-900">
                How bumpy was the ride?
              </h3>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 text-xs font-medium text-stone-500">
                <span>Volatility</span>
                <MetricInfoTrigger term="Volatility" text="Annualized standard deviation of daily returns: Measures how drastically your portfolio's value fluctuates up and down." />
              </div>
              <p className="mt-1 text-2xl sm:text-[28px] font-bold text-stone-900 tabular-nums">
                {volDisplay}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1 text-xs font-medium text-stone-500">
                <span>Largest drop</span>
                <MetricInfoTrigger term="Maximum Drawdown" text="The largest peak-to-trough drop in your portfolio value before a new peak is achieved." />
              </div>
              <p className="mt-1 text-2xl sm:text-[28px] font-bold text-[#E11D48] tabular-nums">
                {mddDisplay}
              </p>
              <p className="mt-1 text-xs font-medium text-stone-500">
                Largest fall from a previous peak.
              </p>
            </div>
          </div>
        </div>

        {/* Card 6: What is in your mix? */}
        <div className="flex flex-col justify-between rounded-3xl border border-[#E0E7FF] bg-[#F3F4FE] p-6 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-indigo-100/60 bg-white text-stone-800 shadow-2xs">
              <Layers className="size-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-stone-900">
                What is in your mix?
              </h3>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setShowHoldingsDrawer(true)}
                className="text-left text-xl sm:text-[26px] font-bold text-stone-900 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {holdingsCount || 9} holdings
              </button>
            </div>

            <div>
              <div className="flex items-center gap-1 text-xs font-medium text-stone-500">
                <span>Active share</span>
                <MetricInfoTrigger term="Active Share" text="Percentage of portfolio holdings that differ from benchmark constituents. Higher active share indicates genuine stock picking rather than index hugging." />
              </div>
              <p className="mt-1 text-2xl sm:text-[28px] font-bold text-stone-900 tabular-nums">
                {activeShareDisplay}
              </p>
              <p className="mt-1 text-xs font-medium text-stone-500">
                How different your holdings are from {benchmarkLabel}.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Bottom Card: Go deeper Accordion */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-2xs transition-all">
        <div
          onClick={() => setIsDeeperOpen(!isDeeperOpen)}
          className="flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <FileText className="size-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                Go deeper
              </h3>
              <p className="text-xs text-stone-500 font-normal">
                Alpha, Sharpe ratio, beta and more
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowGlossaryDialog(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              <HelpCircle className="size-4" />
              <span>What do these numbers mean?</span>
            </button>
            <ChevronDown
              className={cn(
                "size-5 text-stone-400 transition-transform duration-200",
                isDeeperOpen && "rotate-180",
              )}
            />
          </div>
        </div>

        {/* Expanded Deep Metrics Grid */}
        {isDeeperOpen && (
          <div className="mt-6 pt-5 border-t border-stone-100 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DeepMetricCard
                title="Jensen's Alpha"
                explainId="alpha"
                benchmark={benchmarkLabel}
                regression={data?.regression}
                value={findMetric(data?.categories, "alpha")?.formatted ?? "—"}
                desc="Excess return generated beyond benchmark risk exposure."
                formula="α = Rp − [Rf + β(Rm − Rf)]"
              />
              <DeepMetricCard
                title="Portfolio Beta"
                explainId="beta"
                benchmark={benchmarkLabel}
                regression={data?.regression}
                value={findMetric(data?.categories, "beta")?.formatted ?? "—"}
                desc="Sensitivity of returns relative to the benchmark."
                formula="β = Cov(Rp, Rm) / Var(Rm)"
              />
              <DeepMetricCard
                title="Sharpe Ratio"
                explainId="sharpe"
                benchmark={benchmarkLabel}
                regression={data?.regression}
                value={findMetric(data?.categories, "sharpe")?.formatted ?? "—"}
                desc="Excess return earned per unit of total risk."
                formula="Sharpe = (Rp − Rf) / σp"
              />
              <DeepMetricCard
                title="Sortino Ratio"
                explainId="sortino"
                benchmark={benchmarkLabel}
                regression={data?.regression}
                value={findMetric(data?.categories, "sortino")?.formatted ?? "—"}
                desc="Return generated per unit of downside risk."
                formula="Sortino = (Rp − Rf) / σ_down"
              />
              <DeepMetricCard
                title="Treynor Ratio"
                explainId="treynor"
                benchmark={benchmarkLabel}
                regression={data?.regression}
                value={findMetric(data?.categories, "treynor")?.formatted ?? "—"}
                desc="Excess return per unit of systematic beta risk."
                formula="Treynor = (Rp − Rf) / β"
              />
              <DeepMetricCard
                title="Information Ratio"
                explainId="informationRatio"
                benchmark={benchmarkLabel}
                regression={data?.regression}
                value={findMetric(data?.categories, "informationRatio")?.formatted ?? "—"}
                desc="Active return earned per unit of tracking error."
                formula="IR = (Rp − Rm) / Tracking Error"
              />
              <DeepMetricCard
                title="VaR (95% 1-Day)"
                explainId="var"
                benchmark={benchmarkLabel}
                regression={data?.regression}
                value={findMetric(data?.categories, "var")?.formatted ?? "—"}
                desc="Loss exceeded on only 1 day in 20, in rupees."
                formula="Historical VaR @ 95% × portfolio value"
              />
              <DeepMetricCard
                title="Tracking Error"
                explainId="trackingError"
                benchmark={benchmarkLabel}
                regression={data?.regression}
                value={findMetric(data?.categories, "trackingError")?.formatted ?? "—"}
                desc="Standard deviation of active returns vs benchmark."
                formula="σ(Rp − Rm)"
              />
            </div>

            {/* Quick Links to Detailed Sub-Pages */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
              <span className="text-xs font-semibold text-stone-500">Explore in depth:</span>
              <Link
                href="/portfolio/allocation"
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <span>Allocation</span>
                <ArrowRight className="size-3" />
              </Link>
              <Link
                href="/portfolio/risk"
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <span>Risk & VaR</span>
                <ArrowRight className="size-3" />
              </Link>
              <Link
                href="/portfolio/attribution"
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <span>Attribution</span>
                <ArrowRight className="size-3" />
              </Link>
              <Link
                href="/portfolio/quant"
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <span>Quant</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* 5b. Holdings: the full list with every detail, inline */}
      {holdingsCount > 0 ? (
        <section id="holdings" className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3.5 sm:px-5">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900">Holdings ({holdingsCount})</h3>
              <p className="text-xs text-stone-500">Live marks · your book · INR</p>
            </div>
            {!_locked ? (
              <div className="flex items-center gap-2">
                <AddHoldingDialog onAdd={onAddHolding} triggerLabel="Add" />
                <BrokerImportDialog onImport={onImportHoldings} triggerLabel="Import" />
              </div>
            ) : null}
          </div>
          <HoldingsList
            positions={positions}
            onRemove={onRemoveHolding}
            onEdit={onEditHolding}
            onSell={onSellHolding}
            readOnly={_locked}
          />
        </section>
      ) : null}

      {/* 5c. Every metric, one bento card per category */}
      {data && data.categories.length > 0 && holdingsCount > 0 ? (
        <section id="all-metrics" className="space-y-3">
          <div className="px-1">
            <h3 className="text-sm sm:text-base font-bold text-stone-900">All metrics</h3>
            <p className="text-xs text-stone-500">Tap the eye on a metric to see how it is worked out.</p>
          </div>
          <MetricsBento categories={data.categories} benchmark={benchmarkLabel} regression={data.regression} />
        </section>
      ) : null}

      {/* 6. Holdings Slide-over Sheet */}
      <Sheet open={showHoldingsDrawer} onOpenChange={setShowHoldingsDrawer}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-stone-200/80">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl font-bold text-stone-900">
                  Holdings ({positions.length})
                </SheetTitle>
                <SheetDescription className="text-xs text-stone-500 mt-0.5">
                  Live market prices · Virtual investments in INR
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                <AddHoldingDialog onAdd={onAddHolding} triggerLabel="+ Add" />
                <BrokerImportDialog onImport={onImportHoldings} triggerLabel="Import" />
              </div>
            </div>

            {/* Filter and Sort */}
            <div className="mt-4 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-stone-400" />
                <Input
                  type="text"
                  placeholder="Filter by name or symbol…"
                  value={holdingsSearch}
                  onChange={(e) => setHoldingsSearch(e.target.value)}
                  className="pl-8 text-xs rounded-xl"
                />
              </div>
              <select
                value={holdingsSort}
                onChange={(e) => setHoldingsSort(e.target.value as any)}
                className="rounded-xl border border-stone-200 bg-white py-1.5 px-3 text-xs font-semibold text-stone-700 shadow-2xs"
              >
                <option value="weight">Sort by Weight</option>
                <option value="pnl">Sort by P&L</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
          </SheetHeader>

          {/* Holdings List Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {filteredPositions.length === 0 ? (
              <div className="py-12 text-center text-stone-500">
                <p className="text-sm font-semibold">No holdings match.</p>
              </div>
            ) : (
              filteredPositions.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-2xs hover:border-stone-300 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/research/${p.symbol}`}
                        className="text-sm font-bold text-stone-900 hover:text-blue-600 hover:underline"
                      >
                        {p.symbol}
                      </Link>
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600">
                        {p.market}
                      </span>
                      <span className="text-xs text-stone-400 font-medium truncate">
                        {p.name}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-stone-500 font-medium">
                      <span>{p.shares} shares @ {formatInr(p.avgCost)}</span>
                      <span>CMP: {formatInr(p.lastInr)}</span>
                      <span>Weight: {(p.weight * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-stone-900 tabular-nums">
                      {formatInr(p.marketValueInr)}
                    </p>
                    <p
                      className={cn(
                        "text-xs font-semibold tabular-nums mt-0.5",
                        p.pnlInr >= 0 ? "text-emerald-600" : "text-[#E11D48]",
                      )}
                    >
                      {formatInr(p.pnlInr, { showSign: true })} ({formatPct(p.pnlPct, { showSign: true })})
                    </p>
                  </div>

                  <div className="flex items-center gap-1 pl-2 border-l border-stone-100">
                    <button
                      type="button"
                      onClick={() => setEditRow(p)}
                      className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                      title="Edit holding"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellRow(p)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
                      title="Sell shares"
                    >
                      Sell
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveHolding(p.id)}
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete holding"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <EditHoldingDialog
        row={editRow}
        open={Boolean(editRow)}
        onOpenChange={(o) => !o && setEditRow(null)}
        onSave={onEditHolding}
      />
      <SellHoldingDialog
        row={sellRow}
        open={Boolean(sellRow)}
        onOpenChange={(o) => !o && setSellRow(null)}
        onSell={onSellHolding}
      />

      {/* 7. Virtual Cash Edit Dialog */}
      <Dialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-stone-900">
              Edit virtual cash
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Set unallocated cash in your portfolio book. Included in total portfolio value.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <label className="text-xs font-semibold text-stone-700 block mb-1.5">
              Cash Amount (INR)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-500">
                ₹
              </span>
              <Input
                type="number"
                min="0"
                step="1000"
                value={cashInputValue}
                onChange={(e) => setCashInputValue(e.target.value)}
                className="pl-7 rounded-xl font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCashDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCash}
              className="rounded-xl bg-stone-900 text-white hover:bg-black"
            >
              Save cash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Cash Flow History Dialog */}
      <Dialog open={showCashFlowDialog} onOpenChange={setShowCashFlowDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-stone-900">
              Cash-flow history
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Log dated deposits or withdrawals to solve personalized annualized returns (XIRR and IRR).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCashFlow} className="my-3 space-y-3 p-3 bg-stone-50 rounded-xl border border-stone-200/60">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">Date</label>
                <Input
                  type="date"
                  value={cfDate}
                  onChange={(e) => setCfDate(e.target.value)}
                  className="text-xs rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">Type</label>
                <select
                  value={cfType}
                  onChange={(e) => setCfType(e.target.value as any)}
                  className="w-full rounded-lg border border-stone-200 bg-white py-2 px-2 text-xs font-semibold"
                >
                  <option value="DEPOSIT">Deposit (+)</option>
                  <option value="WITHDRAWAL">Withdrawal (−)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">Amount (₹)</label>
                <Input
                  type="number"
                  min="1"
                  placeholder="50000"
                  value={cfAmount}
                  onChange={(e) => setCfAmount(e.target.value)}
                  className="text-xs rounded-lg font-bold"
                  required
                />
              </div>
            </div>
            <Button type="submit" size="sm" className="w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold">
              + Add cash flow entry
            </Button>
          </form>

          {/* List of Entries */}
          <div className="max-h-56 overflow-y-auto space-y-2">
            {cashFlows.length === 0 ? (
              <p className="text-center py-6 text-xs text-stone-400">
                No cash flows recorded yet. Add an initial deposit above.
              </p>
            ) : (
              cashFlows.map((cf) => (
                <div key={cf.id} className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 bg-white text-xs">
                  <div>
                    <span className="font-bold text-stone-800">{cf.date}</span>
                    <span className={cn(
                      "ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold",
                      cf.type === "DEPOSIT" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                    )}>
                      {cf.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold tabular-nums">
                      {cf.type === "DEPOSIT" ? "+" : "−"}{formatInr(cf.amountInr)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCashFlow(cf.id)}
                      className="text-stone-400 hover:text-rose-600"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowCashFlowDialog(false)} className="rounded-xl">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. Glossary Modal ("What do these numbers mean?") */}
      <Dialog open={showGlossaryDialog} onOpenChange={setShowGlossaryDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col rounded-2xl p-0">
          <DialogHeader className="p-6 border-b border-stone-200">
            <DialogTitle className="text-xl font-bold text-stone-900">
              Metric Glossary & Guide
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Understand the formulas, definitions, and investment intuition behind every number.
            </DialogDescription>
            <div className="mt-3 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-stone-400" />
              <Input
                placeholder="Search metrics (alpha, sharpe, xirr, volatility)…"
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                className="pl-8 text-xs rounded-xl"
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {Object.values(GLOSSARY)
              .filter((g) => {
                if (!glossarySearch.trim()) return true;
                const q = glossarySearch.toLowerCase();
                return (
                  g.label.toLowerCase().includes(q) ||
                  g.definition.toLowerCase().includes(q) ||
                  g.why.toLowerCase().includes(q)
                );
              })
              .map((g) => (
                <div key={g.id} className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-stone-900">{g.label}</h4>
                    {g.specSection && (
                      <span className="text-[10px] font-bold text-stone-400 uppercase">
                        Spec {g.specSection}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-700">{g.definition}</p>
                  <p className="text-[11px] text-stone-500 italic">Formula: {g.formula}</p>
                  <p className="text-xs text-blue-700 bg-blue-50/70 p-2 rounded-lg font-medium">
                    Why it matters: {g.why}
                  </p>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 10. Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-stone-900">
              Rename portfolio
            </DialogTitle>
          </DialogHeader>
          <div className="my-3">
            <Input
              value={portfolioName}
              onChange={(e) => setPortfolioName(e.target.value)}
              placeholder="Portfolio name"
              className="rounded-xl font-semibold"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveName} className="rounded-xl bg-stone-900 text-white">
              Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </MetricExplainProvider>
  );
}

// Small helper for tooltip/popover
function MetricInfoTrigger({ term, text }: { term: string; text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
          aria-label={`Info about ${term}`}
        >
          <HelpCircle className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 rounded-xl p-3 text-xs shadow-md">
        <p className="font-bold text-stone-900 mb-1">{term}</p>
        <p className="text-stone-600 leading-relaxed">{text}</p>
      </PopoverContent>
    </Popover>
  );
}

// Deep Metric Card for Go Deeper section
function DeepMetricCard({
  title,
  value,
  desc,
  formula,
  explainId,
  benchmark,
  regression,
}: {
  title: string;
  value: string;
  desc: string;
  formula: string;
  explainId: string;
  benchmark: string;
  regression?: RegressionInputs | null;
}) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-stone-50/40 p-3.5 hover:bg-stone-50 transition-colors">
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold text-stone-600">{title}</span>
        <MetricEyeButton id={explainId} value={value} benchmark={benchmark} regression={regression} />
      </div>
      <p className="mt-1 text-lg font-extrabold text-stone-900 tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-stone-500 leading-snug">{desc}</p>
      <p className="mt-1 text-[10px] text-stone-400 font-normal italic">{formula}</p>
    </div>
  );
}
