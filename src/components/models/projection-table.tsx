import { formatByFmt, formatMillions } from "@/lib/models/format";
import type { ProjectionYear } from "@/lib/models/types";

const ROWS: { key: keyof ProjectionYear; label: string; kind: "money" | "eps" }[] = [
  { key: "revenue", label: "Revenue", kind: "money" },
  { key: "ebitda", label: "EBITDA", kind: "money" },
  { key: "ebit", label: "EBIT", kind: "money" },
  { key: "nopat", label: "NOPAT", kind: "money" },
  { key: "fcff", label: "Unlevered free cash flow", kind: "money" },
  { key: "netIncome", label: "Net income", kind: "money" },
  { key: "eps", label: "Diluted EPS", kind: "eps" },
];

export function ProjectionTable({ years, currency }: { years: ProjectionYear[]; currency: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse font-mono text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="py-2 pr-3 text-left font-medium text-muted-foreground">Line item</th>
            {years.map((y) => (
              <th key={y.label} className="py-2 px-3 text-right font-medium text-muted-foreground">
                {y.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.key as string} className="border-b border-border/50">
              <td className="py-1.5 pr-3 text-muted-foreground">{row.label}</td>
              {years.map((y) => (
                <td key={y.label} className="py-1.5 px-3 text-right tabular-nums text-foreground">
                  {row.kind === "eps" ? formatByFmt(y[row.key] as number, "price", currency) : formatMillions(y[row.key] as number, currency)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
