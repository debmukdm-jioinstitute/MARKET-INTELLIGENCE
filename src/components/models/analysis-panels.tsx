"use client";

import type { FootballBar, GrowthMarginGrid, MonteCarloResult, ReverseDcfResult, ScenarioResult, TornadoBar } from "@/lib/models/analysis";
import { formatByFmt, formatMillions } from "@/lib/models/format";
import type { BridgeResult, ModelResult, PeerSet, QualityFlag } from "@/lib/models/types";
import { cn } from "@/lib/utils";

const px = (v: number, ccy: string) => formatByFmt(v, "price", ccy);

export function ScenarioPanel({ result, currency }: { result: ScenarioResult; currency: string }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-1.5 pr-3 text-left font-medium">Scenario</th>
              <th className="px-3 text-right font-medium">Probability</th>
              <th className="px-3 text-right font-medium">Growth / margin / WACC shift</th>
              <th className="px-3 text-right font-medium">Value</th>
              <th className="pl-3 text-right font-medium">vs price</th>
            </tr>
          </thead>
          <tbody>
            {result.scenarios.map((s) => (
              <tr key={s.name} className="border-b border-border/50">
                <td className="py-1.5 pr-3 text-foreground">{s.name}</td>
                <td className="px-3 text-right tabular-nums">{(s.probability * 100).toFixed(0)}%</td>
                <td className="px-3 text-right tabular-nums text-muted-foreground">
                  {`${((s.shift.growth ?? 0) * 100).toFixed(1)}pp / ${((s.shift.margin ?? 0) * 100).toFixed(1)}pp / ${((s.shift.wacc ?? 0) * 100).toFixed(2)}pp`}
                </td>
                <td className="px-3 text-right tabular-nums text-foreground">{px(s.price, currency)}</td>
                <td className={cn("pl-3 text-right tabular-nums", s.upside >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  {s.upside >= 0 ? "+" : ""}{(s.upside * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-1.5 pr-3 font-medium text-foreground">Probability-weighted</td>
              <td />
              <td />
              <td className="px-3 text-right font-semibold tabular-nums text-foreground">{px(result.expectedPrice, currency)}</td>
              <td className={cn("pl-3 text-right font-semibold tabular-nums", result.expectedUpside >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {result.expectedUpside >= 0 ? "+" : ""}{(result.expectedUpside * 100).toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground">For financials, the margin shift acts as a return-on-equity shift.</p>
    </div>
  );
}

export function MonteCarloPanel({ result, currency, currentPrice }: { result: MonteCarloResult; currency: string; currentPrice: number }) {
  const max = Math.max(...result.histogram.map((h) => h.count), 1);
  return (
    <div className="space-y-3 text-sm">
      <div className="flex h-32 items-end gap-0.5">
        {result.histogram.map((h, i) => {
          const mid = (h.lo + h.hi) / 2;
          return (
            <div
              key={i}
              title={`${px(h.lo, currency)} – ${px(h.hi, currency)}: ${h.count}`}
              className={cn("flex-1 rounded-t", mid >= currentPrice ? "bg-emerald-600/70" : "bg-rose-600/60")}
              style={{ height: `${(h.count / max) * 100}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>{px(result.histogram[0].lo, currency)}</span>
        <span>Current {px(currentPrice, currency)}</span>
        <span>{px(result.histogram[result.histogram.length - 1].hi, currency)}</span>
      </div>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-1 sm:grid-cols-6">
        {[["P10", result.p10], ["P25", result.p25], ["Median", result.p50], ["Mean", result.mean], ["P75", result.p75], ["P90", result.p90]].map(([l, v]) => (
          <div key={l as string}>
            <dt className="text-muted-foreground">{l}</dt>
            <dd className="tabular-nums text-foreground">{px(v as number, currency)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground">
        {(result.probUpside * 100).toFixed(0)}% of {result.runs.toLocaleString()} draws value the stock above today&apos;s price. Draws: revenue growth ±2pp/yr, EBIT margin ±1.5pp, WACC ±0.5pp, terminal growth ±0.35pp (1 s.d., independent normals, fixed seed).
      </p>
    </div>
  );
}

export function TornadoChart({ basePrice, bars, currency }: { basePrice: number; bars: TornadoBar[]; currency: string }) {
  const lo = Math.min(...bars.map((b) => Math.min(b.low, b.high)), basePrice);
  const hi = Math.max(...bars.map((b) => Math.max(b.low, b.high)), basePrice);
  const span = hi - lo || 1;
  const pos = (v: number) => ((v - lo) / span) * 100;
  return (
    <div className="space-y-2 text-sm">
      {bars.map((b) => {
        const a = Math.min(b.low, b.high), z = Math.max(b.low, b.high);
        return (
          <div key={b.label} className="grid grid-cols-[9rem_1fr] items-center gap-3">
            <span className="text-muted-foreground">{b.label}</span>
            <div className="relative h-5 rounded bg-secondary/40">
              <div className="absolute inset-y-0 rounded bg-blue-600/60" style={{ left: `${pos(a)}%`, width: `${Math.max(pos(z) - pos(a), 0.8)}%` }} title={`${b.lowLabel}: ${px(b.low, currency)} · ${b.highLabel}: ${px(b.high, currency)}`} />
              <div className="absolute inset-y-0 w-px bg-foreground" style={{ left: `${pos(basePrice)}%` }} />
            </div>
          </div>
        );
      })}
      <p className="text-muted-foreground">
        Bars show implied value per share when each driver is flexed (base {px(basePrice, currency)}, vertical line). Hover a bar for the low / high case.
      </p>
    </div>
  );
}

export function FootballField({ bars, currentPrice, currency }: { bars: FootballBar[]; currentPrice: number; currency: string }) {
  const lo = Math.min(...bars.map((b) => b.low), currentPrice) * 0.95;
  const hi = Math.max(...bars.map((b) => b.high), currentPrice) * 1.05;
  const span = hi - lo || 1;
  const pos = (v: number) => ((v - lo) / span) * 100;
  return (
    <div className="space-y-2.5 text-sm">
      {bars.map((b) => (
        <div key={b.label} className="grid grid-cols-[12rem_1fr] items-center gap-3">
          <div>
            <p className="text-foreground">{b.label}</p>
            {b.note ? <p className="text-muted-foreground">{b.note}</p> : null}
          </div>
          <div className="relative h-6 rounded bg-secondary/40">
            <div className="absolute inset-y-0 rounded bg-blue-600/55" style={{ left: `${pos(b.low)}%`, width: `${Math.max(pos(b.high) - pos(b.low), 0.8)}%` }} />
            <div className="absolute inset-y-0 w-0.5 bg-foreground/80" style={{ left: `${pos(b.mid)}%` }} />
            <div className="absolute inset-y-0 w-px bg-emerald-600" style={{ left: `${pos(currentPrice)}%` }} />
            <span className="absolute left-1 top-0.5 text-sm text-foreground/90">{px(b.low, currency)}</span>
            <span className="absolute right-1 top-0.5 text-sm text-foreground/90">{px(b.high, currency)}</span>
          </div>
        </div>
      ))}
      <p className="text-muted-foreground">Green line = current price ({px(currentPrice, currency)}); dark tick = midpoint / median.</p>
    </div>
  );
}

export function ReversePanel({ result, currency }: { result: ReverseDcfResult; currency: string }) {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">
        Holding every other assumption at the base case, what does the market price of {px(result.targetPrice, currency)} imply?
      </p>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Average revenue growth</dt>
          <dd className="tabular-nums text-foreground">
            {result.impliedAvgGrowth == null ? "no solution in ±30pp" : `${(result.impliedAvgGrowth * 100).toFixed(1)}% implied vs ${(result.baseAvgGrowth * 100).toFixed(1)}% in the model`}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Terminal-year EBIT margin</dt>
          <dd className="tabular-nums text-foreground">
            {result.impliedEbitMargin == null ? "no solution in ±30pp" : `${(result.impliedEbitMargin * 100).toFixed(1)}% implied vs ${(result.baseEbitMargin * 100).toFixed(1)}% in the model`}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function GrowthMarginTable({ grid, currency }: { grid: GrowthMarginGrid; currency: string }) {
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-sm font-medium text-foreground">Implied price: EBIT margin shift (rows) vs revenue growth shift per year (columns)</p>
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-border/60 bg-secondary/40 px-2 py-1.5 text-left text-muted-foreground">margin \ growth</th>
            {grid.growthShifts.map((g) => (
              <th key={g} className="border border-border/60 bg-secondary/40 px-2 py-1.5 text-right text-muted-foreground">{g >= 0 ? "+" : ""}{(g * 100).toFixed(0)}pp</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.grid.map((row, r) => (
            <tr key={r}>
              <td className="border border-border/60 bg-secondary/20 px-2 py-1.5 text-muted-foreground">{grid.marginShifts[r] >= 0 ? "+" : ""}{(grid.marginShifts[r] * 100).toFixed(0)}pp</td>
              {row.map((v, c) => (
                <td key={c} className={cn("border border-border/60 px-2 py-1.5 text-right tabular-nums", r === 2 && c === 2 ? "bg-blue-600/15 font-semibold text-blue-600" : "text-foreground")}>
                  {px(v, currency)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BridgePanel({ model }: { model: ModelResult }) {
  const { dcf } = model;
  const ccy = model.dataset.profile.currency;
  const b: BridgeResult = dcf.bridge;
  const rows: [string, number, boolean?][] = [
    ["Sum of PV of FCFF", dcf.sumPv],
    ["PV of terminal value", dcf.pvTv],
    ["Enterprise value", b.enterpriseValue, true],
    ["Less: total debt", b.lessDebt],
    ["Less: minority interest", b.lessMinority],
    ["Less: preferred equity", b.lessPreferred],
    ["Less: pension deficit", b.lessPension],
    ["Less: other debt-like items", b.lessOtherDebtLike],
    ["Plus: cash & ST investments", b.plusCash],
    ["Plus: long-term investments", b.plusInvestments],
    ["Equity value", b.equityValue, true],
  ];
  const d = dcf.dilution;
  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {rows
          .filter(([, v, bold]) => bold || Math.abs(v) > 1e-9)
          .map(([label, value, bold]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className={cn("tabular-nums text-foreground", bold && "font-semibold")}>{formatMillions(value, ccy)}</dd>
            </div>
          ))}
      </dl>
      <p className="text-muted-foreground">
        Per-share value uses {formatByFmt(d.dilutedShares, "num1")}M diluted shares (basic {formatByFmt(d.basicShares, "num1")}M
        {d.incrementalShares > 0 ? ` + ${formatByFmt(d.incrementalShares, "num1")}M from options ${formatByFmt(d.optionShares, "num1")}M / RSUs ${formatByFmt(d.rsuShares, "num1")}M / converts ${formatByFmt(d.convertShares, "num1")}M` : ", no dilution applied"}
        ), solved with the treasury-stock method at the implied price.
      </p>
    </div>
  );
}

export function TerminalPanel({ model }: { model: ModelResult }) {
  const t = model.dcf.terminal;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      {[
        ["Terminal growth", formatByFmt(t.growth, "pct2")],
        ["Marginal tax rate", formatByFmt(t.taxRate, "pct")],
        ["Terminal ROIC", formatByFmt(t.roic, "pct")],
        ["Reinvestment rate (g / ROIC)", formatByFmt(t.reinvestmentRate, "pct")],
        ["Normalised NOPAT (yr N+1)", formatMillions(t.nopat, model.dataset.profile.currency)],
        ["Normalised FCFF (yr N+1)", formatMillions(t.fcff, model.dataset.profile.currency)],
        ["Terminal value share of EV", formatByFmt(model.dcf.tvShareOfEv, "pct")],
        ["Implied exit EV/EBITDA", formatByFmt(model.dcf.impliedExitMultiple, "mult")],
        ["Growth implied by exit multiple", formatByFmt(model.dcf.impliedGrowthFromExit, "pct2")],
      ].map(([l, v]) => (
        <div key={l}>
          <dt className="text-muted-foreground">{l}</dt>
          <dd className="tabular-nums text-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RiPanel({ model }: { model: ModelResult }) {
  const ri = model.ri!;
  const ccy = model.dataset.profile.currency;
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        Residual-income model (banks / insurers / NBFCs): equity value = book value + PV of (ROE − cost of equity) × opening book. ROE fades from the starting level to cost of equity + the long-run spread.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-1.5 pr-3 text-left font-medium">Line</th>
              {ri.years.map((y) => <th key={y.label} className="px-3 text-right font-medium">{y.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              ["Opening book equity", (y: (typeof ri.years)[number]) => formatMillions(y.bookOpen, ccy)],
              ["ROE", (y: (typeof ri.years)[number]) => formatByFmt(y.roe, "pct")],
              ["Net income", (y: (typeof ri.years)[number]) => formatMillions(y.netIncome, ccy)],
              ["Equity charge", (y: (typeof ri.years)[number]) => formatMillions(y.equityCharge, ccy)],
              ["Residual income", (y: (typeof ri.years)[number]) => formatMillions(y.residualIncome, ccy)],
            ].map(([label, fn]) => (
              <tr key={label as string} className="border-b border-border/50">
                <td className="py-1.5 pr-3 text-muted-foreground">{label as string}</td>
                {ri.years.map((y) => <td key={y.label} className="px-3 text-right tabular-nums text-foreground">{(fn as (y: (typeof ri.years)[number]) => string)(y)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {[
          ["Book value", formatMillions(ri.bookValue, ccy)],
          ["PV of residual income", formatMillions(ri.sumPvRi, ccy)],
          ["PV of terminal value", formatMillions(ri.pvTvRi, ccy)],
          ["Equity value", formatMillions(ri.equityValue, ccy)],
          ["Cost of equity", formatByFmt(ri.costOfEquity, "pct2")],
          ["Long-run ROE", formatByFmt(ri.terminalRoe, "pct2")],
          ["Implied P/B", formatByFmt(ri.impliedPb, "mult")],
        ].map(([l, v]) => (
          <div key={l}>
            <dt className="text-muted-foreground">{l}</dt>
            <dd className="tabular-nums text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function CompsPanel({ peers, model }: { peers: PeerSet; model: ModelResult }) {
  const m = model.multiples;
  const f = (v: number | null, d = 1) => (v == null ? "—" : `${v.toFixed(d)}x`);
  return (
    <div className="space-y-3 text-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              {["Company", "EV/EBITDA", "EV/Sales", "P/E", "P/B", "Unlevered β"].map((h, i) => (
                <th key={h} className={cn("py-1.5 font-medium", i === 0 ? "pr-3 text-left" : "px-3 text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/50 bg-blue-600/5">
              <td className="py-1.5 pr-3 font-medium text-foreground">{model.dataset.profile.symbol} (this company)</td>
              <td className="px-3 text-right tabular-nums">{f(m.currentEvEbitda)}</td>
              <td className="px-3 text-right tabular-nums">—</td>
              <td className="px-3 text-right tabular-nums">{f(m.currentPe)}</td>
              <td className="px-3 text-right tabular-nums">{f(m.currentPb, 2)}</td>
              <td className="px-3 text-right tabular-nums">{model.beta.unleveredBeta.toFixed(2)}</td>
            </tr>
            {peers.peers.map((p) => (
              <tr key={p.symbol} className="border-b border-border/50">
                <td className="py-1.5 pr-3 text-muted-foreground">{p.symbol}</td>
                <td className="px-3 text-right tabular-nums">{f(p.evEbitda)}</td>
                <td className="px-3 text-right tabular-nums">{f(p.evSales, 2)}</td>
                <td className="px-3 text-right tabular-nums">{f(p.pe)}</td>
                <td className="px-3 text-right tabular-nums">{f(p.pb, 2)}</td>
                <td className="px-3 text-right tabular-nums">{p.unleveredBeta.toFixed(2)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-1.5 pr-3 font-medium text-foreground">Peer median</td>
              <td className="px-3 text-right tabular-nums font-medium">{f(peers.medians.evEbitda)}</td>
              <td className="px-3 text-right tabular-nums font-medium">{f(peers.medians.evSales, 2)}</td>
              <td className="px-3 text-right tabular-nums font-medium">{f(peers.medians.pe)}</td>
              <td className="px-3 text-right tabular-nums font-medium">{f(peers.medians.pb, 2)}</td>
              <td className="px-3 text-right tabular-nums font-medium">{peers.medianUnleveredBeta?.toFixed(2) ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground">{peers.source}. Multiples use trailing-twelve-month figures where available.</p>
    </div>
  );
}

export function QualityPanel({ flags }: { flags: QualityFlag[] }) {
  if (!flags.length) return <p className="text-sm text-emerald-600">No data-quality issues detected.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {flags.map((f) => (
        <li key={f.label} className="flex gap-2">
          <span className={cn("mt-0.5 shrink-0 rounded px-1.5 text-sm font-semibold", f.severity === "warn" ? "bg-rose-600/15 text-rose-600" : "bg-blue-600/15 text-blue-600")}>
            {f.severity === "warn" ? "WARN" : "INFO"}
          </span>
          <span>
            <span className="text-foreground">{f.label}.</span> <span className="text-muted-foreground">{f.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
