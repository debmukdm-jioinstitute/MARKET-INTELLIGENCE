"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

interface SectorRow {
  name: string;
  niftyWeight: number;
  return1D: number;
  return1W: number;
  return1M: number;
  return1Y: number;
  pe: number;
  pb: number;
  roe: number;
  rotationStage: "Leading" | "Weakening" | "Lagging" | "Improving";
  topPick: string;
}

const SECTOR_DATA: SectorRow[] = [
  {
    name: "Financial Services",
    niftyWeight: 33.4,
    return1D: 0.011,
    return1W: 0.024,
    return1M: 0.048,
    return1Y: 0.182,
    pe: 16.2,
    pb: 2.1,
    roe: 15.4,
    rotationStage: "Leading",
    topPick: "HDFCBANK",
  },
  {
    name: "Information Technology",
    niftyWeight: 14.1,
    return1D: -0.006,
    return1W: 0.012,
    return1M: -0.018,
    return1Y: 0.224,
    pe: 28.4,
    pb: 7.2,
    roe: 28.1,
    rotationStage: "Lagging",
    topPick: "TCS",
  },
  {
    name: "Oil, Gas & Consumables",
    niftyWeight: 11.8,
    return1D: 0.008,
    return1W: 0.016,
    return1M: 0.034,
    return1Y: 0.142,
    pe: 14.8,
    pb: 1.8,
    roe: 13.9,
    rotationStage: "Improving",
    topPick: "RELIANCE",
  },
  {
    name: "Automobile & Components",
    niftyWeight: 7.6,
    return1D: 0.014,
    return1W: 0.031,
    return1M: 0.062,
    return1Y: 0.384,
    pe: 24.1,
    pb: 4.6,
    roe: 19.8,
    rotationStage: "Leading",
    topPick: "M&M",
  },
  {
    name: "Fast Moving Consumer Goods",
    niftyWeight: 7.2,
    return1D: 0.002,
    return1W: 0.005,
    return1M: 0.012,
    return1Y: 0.086,
    pe: 38.6,
    pb: 9.8,
    roe: 26.4,
    rotationStage: "Weakening",
    topPick: "ITC",
  },
  {
    name: "Construction & CapGoods",
    niftyWeight: 6.1,
    return1D: 0.009,
    return1W: 0.022,
    return1M: 0.051,
    return1Y: 0.321,
    pe: 32.4,
    pb: 5.1,
    roe: 17.2,
    rotationStage: "Leading",
    topPick: "LT",
  },
  {
    name: "Healthcare & Pharma",
    niftyWeight: 4.8,
    return1D: 0.005,
    return1W: 0.018,
    return1M: 0.041,
    return1Y: 0.286,
    pe: 34.2,
    pb: 4.8,
    roe: 16.1,
    rotationStage: "Improving",
    topPick: "SUNPHARMA",
  },
  {
    name: "Metals & Mining",
    niftyWeight: 3.6,
    return1D: -0.004,
    return1W: -0.011,
    return1M: 0.028,
    return1Y: 0.198,
    pe: 12.8,
    pb: 1.7,
    roe: 14.2,
    rotationStage: "Weakening",
    topPick: "TATASTEEL",
  },
  {
    name: "Power & Utilities",
    niftyWeight: 3.2,
    return1D: 0.012,
    return1W: 0.028,
    return1M: 0.054,
    return1Y: 0.442,
    pe: 18.6,
    pb: 2.4,
    roe: 14.8,
    rotationStage: "Leading",
    topPick: "NTPC",
  },
  {
    name: "Telecommunication",
    niftyWeight: 3.8,
    return1D: 0.018,
    return1W: 0.042,
    return1M: 0.078,
    return1Y: 0.521,
    pe: 42.1,
    pb: 6.2,
    roe: 18.6,
    rotationStage: "Leading",
    topPick: "BHARTIARTL",
  },
];

import { MetricInfo } from "@/components/ui/metric-info";

export default function SectorsPage() {
  const [activeTab, setActiveTab] = useState<"performance" | "rotation" | "valuation" | "fundamentals">("performance");

  return (
    <div className="portal-page pb-10">
      <PageHeader
        kicker="Sector Matrix"
        title="Sector Intelligence & Rotation Workbench"
        subtitle="Decomposition of Indian industry verticals: relative momentum, rotation quadrant, valuation dispersion, and return on equity."
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 text-sm">
        {[
          { id: "performance", label: "Performance Matrix" },
          { id: "rotation", label: "Rotation Quadrant" },
          { id: "valuation", label: "Valuation Multiples" },
          { id: "fundamentals", label: "Fundamentals & ROE" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border/60",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rotation Quadrant Summary */}
      {activeTab === "rotation" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {[
            {
              stage: "Leading",
              color: "text-emerald-600 border-emerald-500/40 bg-emerald-500/10",
              desc: "High relative momentum, outperforming benchmark",
              items: SECTOR_DATA.filter((s) => s.rotationStage === "Leading"),
            },
            {
              stage: "Weakening",
              color: "text-blue-600 border-blue-600/40 bg-blue-600/10",
              desc: "Losing relative strength despite positive returns",
              items: SECTOR_DATA.filter((s) => s.rotationStage === "Weakening"),
            },
            {
              stage: "Lagging",
              color: "text-rose-600 border-rose-500/40 bg-rose-500/10",
              desc: "Underperforming benchmark across short & medium term",
              items: SECTOR_DATA.filter((s) => s.rotationStage === "Lagging"),
            },
            {
              stage: "Improving",
              color: "text-blue-400 border-blue-500/40 bg-blue-500/10",
              desc: "Momentum inflecting positive from oversold levels",
              items: SECTOR_DATA.filter((s) => s.rotationStage === "Improving"),
            },
          ].map((q) => (
            <div key={q.stage} className={cn("rounded-xl border p-4 space-y-2", q.color)}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm tracking-wider uppercase block">{q.stage}</span>
                <MetricInfo metric="dma" customTitle={`Relative Rotation Stage: ${q.stage}`} />
              </div>
              <p className="text-sm font-sans text-muted-foreground leading-snug">{q.desc}</p>
              <div className="pt-2 space-y-1.5">
                {q.items.map((s) => (
                  <div key={s.name} className="flex justify-between items-center text-foreground font-semibold">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">{s.niftyWeight}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Main Sector Table with MetricInfo on every column */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="inline-flex items-center">
                  Sector Vertical <MetricInfo metric="concentration" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center justify-end">
                  NIFTY Wgt <MetricInfo metric="concentration" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center justify-end">
                  1D Return <MetricInfo metric="today_pnl" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center justify-end">
                  1W Return <MetricInfo metric="total_return" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center justify-end">
                  1M Return <MetricInfo metric="total_return" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center justify-end">
                  1Y Return <MetricInfo metric="total_return" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center justify-end">
                  P/E <MetricInfo metric="pe_ratio" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center justify-end">
                  P/B <MetricInfo metric="pb_ratio" />
                </span>
              </TableHead>
              <TableHead className="text-right">
                <span className="inline-flex items-center justify-end">
                  ROE <MetricInfo metric="earnings_results" />
                </span>
              </TableHead>
              <TableHead className="text-center">
                <span className="inline-flex items-center justify-center">
                  Rotation <MetricInfo metric="dma" />
                </span>
              </TableHead>
              <TableHead className="text-right">Anchor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SECTOR_DATA.map((s) => (
              <TableRow key={s.name} className="text-sm hover:bg-accent/40">
                <TableCell className="font-bold text-foreground">{s.name}</TableCell>
                <TableCell className="text-right text-muted-foreground">{s.niftyWeight}%</TableCell>
                <TableCell className={cn("text-right font-bold", s.return1D >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatPct(s.return1D)}
                </TableCell>
                <TableCell className={cn("text-right font-bold", s.return1W >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatPct(s.return1W)}
                </TableCell>
                <TableCell className={cn("text-right font-bold", s.return1M >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatPct(s.return1M)}
                </TableCell>
                <TableCell className={cn("text-right font-bold", s.return1Y >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {formatPct(s.return1Y)}
                </TableCell>
                <TableCell className="text-right text-foreground font-semibold">{s.pe}x</TableCell>
                <TableCell className="text-right text-foreground">{s.pb}x</TableCell>
                <TableCell className="text-right text-emerald-600 font-semibold">{s.roe}%</TableCell>
                <TableCell className="text-center">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-sm font-bold uppercase",
                      s.rotationStage === "Leading"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : s.rotationStage === "Improving"
                        ? "bg-blue-500/10 text-blue-400"
                        : s.rotationStage === "Weakening"
                        ? "bg-blue-600/10 text-blue-600"
                        : "bg-rose-500/10 text-rose-600",
                    )}
                  >
                    {s.rotationStage}
                  </span>
                </TableCell>
                <TableCell className="text-right font-bold text-primary">{s.topPick}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
