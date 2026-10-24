import type { Kpi } from "@/lib/indices/tipsheet-indices";
import { dmy } from "@/lib/format";
import { glanceLine } from "@/lib/story";

const ink3 = { color: "var(--ink-3)" } as const;
const RED = "#b3312f";
const GREEN = "#17603a";
const num = (t: string) => parseFloat(t.replace("−", "-").replace(/[^\d.\-]/g, ""));
const tone = (v: number) => (v < 0 ? RED : GREEN);
const tint = (v: number) => ({ backgroundColor: v < 0 ? "rgba(192,73,65,0.10)" : "rgba(34,139,84,0.10)" });

function Head({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="border-b-2 pb-2 text-xl font-semibold tracking-tight" style={{ borderColor: "var(--ink)" }}>
      <span style={ink3} className="font-normal">{n} /</span> {title}
    </h2>
  );
}

const Big = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <p className="text-4xl font-bold leading-none tracking-tight tabular-nums sm:text-5xl" style={{ color }}>{children}</p>
);
const Label = ({ children }: { children: React.ReactNode }) => <p className="text-sm" style={ink3}>{children}</p>;

/** The three-column read of one index: trend and momentum, returns, valuation and risk, plus a one-line summary. */
export function IndexOverview({ kpis, asOf }: { kpis: Kpi[]; asOf: string }) {
  const k = (l: string) => kpis.find((x) => x.label === l);
  const trend = k("Trend");
  const mom = k("Momentum");
  const below = k("Below its high");
  const pe = k("P/E");
  const vol = k("Volatility");
  const rets = kpis.filter((x) => /^(\d+ years?|Since .+)$/.test(x.label));
  const pct = Number(pe?.sub.match(/(\d+)(?:st|nd|rd|th) percentile/)?.[1]);
  const volNow = vol ? num(vol.value) : NaN;
  const volUsual = Number(vol?.sub.match(/usual (\d+(?:\.\d+)?)%/)?.[1]);
  const volMax = Math.max(volNow, volUsual) || 1;
  const oneYear = k("1 year") ? num(k("1 year")!.value) : null;
  const glance = glanceLine(oneYear, rets.map((r) => num(r.value)));
  const up = trend?.value.toLowerCase().includes("up");
  const trendColor = trend ? (up ? GREEN : trend.value.toLowerCase().includes("down") ? RED : undefined) : undefined;

  return (
    <section aria-label="Overview" className="space-y-4">
      {trend ? (
        <p className="flex items-center gap-2 text-lg">
          <span aria-hidden className="inline-block size-3.5 rounded-full" style={{ background: trendColor ?? "var(--hist)" }} />
          <span className="font-semibold" style={{ color: trendColor }}>{trend.value}</span>
          <span style={ink3}>{dmy(trend.sub)}</span>
        </p>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-3 lg:gap-0 lg:divide-x" style={{ borderColor: "var(--rule)" }}>
        <div className="space-y-5 lg:pr-8">
          <Head n="01" title="Trend & momentum" />
          {trend ? <div className="space-y-1"><Label>Trend</Label><Big color={trendColor}>{trend.value}</Big><Label>{dmy(trend.sub)}</Label></div> : null}
          {mom ? <div className="space-y-1 border-t pt-4" style={{ borderColor: "var(--rule)" }}><Label>Momentum rank</Label><Big>{mom.value.split(" ")[0]}</Big><Label>{mom.value.split(" ").slice(1).join(" ")} {mom.sub}</Label></div> : null}
          {below ? <div className="space-y-1 border-t pt-4" style={{ borderColor: "var(--rule)" }}><Label>Below its high</Label><Big color={RED}>{below.value}</Big><Label>{below.sub} basis</Label></div> : null}
        </div>
        <div className="space-y-4 lg:px-8">
          <Head n="02" title="Returns" />
          <table className="w-full border-collapse text-sm tabular-nums">
            <thead style={ink3}><tr className="border-b" style={{ borderColor: "var(--rule)" }}><th className="py-2 text-left font-medium">Period</th><th className="py-2 text-left font-medium">Return</th></tr></thead>
            <tbody>
              {rets.map((r) => {
                const v = num(r.value);
                return (
                  <tr key={r.label} className="border-b last:border-0" style={{ borderColor: "var(--rule)" }}>
                    <th scope="row" className="py-3 text-left text-base font-normal">{r.label}</th>
                    <td className="px-3 py-2" style={tint(v)}>
                      <span className="block text-xl font-semibold" style={{ color: tone(v) }}>{Number.isFinite(v) && v > 0 && !r.value.startsWith("+") ? `+${r.value}` : r.value}</span>
                      <span className="block text-xs" style={ink3}>{r.sub === "a year" ? "Per year" : r.sub.charAt(0).toUpperCase() + r.sub.slice(1)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="space-y-5 lg:pl-8">
          <Head n="03" title="Valuation & risk" />
          {pe ? (
            <div className="space-y-2">
              <Label>Price / earnings</Label>
              <Big>{pe.value}×</Big>
              <Label>{pe.sub}</Label>
              {Number.isFinite(pct) ? (
                <div>
                  <div className="relative mt-3 h-1.5 rounded-full" style={{ background: "var(--paper-2)" }} role="img" aria-label={`${pct}th percentile of its own history`}>
                    <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: "var(--s3)" }} />
                    <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pct}%`, background: "var(--ink)" }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs" style={ink3}><span>Lower</span><span>Higher</span></div>
                </div>
              ) : null}
            </div>
          ) : null}
          {vol ? (
            <div className="space-y-2 border-t pt-4" style={{ borderColor: "var(--rule)" }}>
              <Label>Volatility</Label>
              <Big>{vol.value}</Big>
              <Label>{vol.sub.replace("past year; usual", "Past year · Usual")}</Label>
              {Number.isFinite(volNow) && Number.isFinite(volUsual) ? (
                <div className="space-y-1.5 pt-1 text-sm">
                  {[["Past year", volNow, "var(--s3)"], ["Usual", volUsual, "var(--hist)"]].map(([l, v, c]) => (
                    <div key={l as string} className="flex items-center gap-3"><span className="w-20" style={ink3}>{l as string}</span><span className="h-2.5 rounded-sm" style={{ width: `${((v as number) / volMax) * 55}%`, background: c as string }} /><span className="ml-auto tabular-nums">{v as number}%</span></div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {glance ? (
        <p className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-md px-4 py-3" style={{ background: "var(--paper-2)" }}>
          <span className="text-xs font-medium uppercase tracking-wider" style={ink3}>At a glance</span>
          <span className="text-lg font-medium sm:text-xl">{glance}</span>
        </p>
      ) : null}
      <p className="sr-only">Data to {dmy(asOf)}</p>
    </section>
  );
}
