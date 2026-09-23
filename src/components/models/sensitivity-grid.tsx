import { formatByFmt } from "@/lib/models/format";
import type { SensitivityTable } from "@/lib/models/types";
import { cn } from "@/lib/utils";

export function SensitivityGrid({ table, rowFmt, currency }: { table: SensitivityTable; rowFmt: "pct2" | "mult"; currency: string }) {
  const centerRow = Math.floor(table.rowValues.length / 2);
  const centerCol = Math.floor(table.waccSteps.length / 2);
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-foreground">{table.title}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse font-mono text-[11px]">
          <thead>
            <tr>
              <th className="border border-border/60 bg-secondary/40 px-2 py-1.5 text-left text-muted-foreground">
                {table.rowLabel} \ WACC
              </th>
              {table.waccSteps.map((w, i) => (
                <th key={i} className="border border-border/60 bg-secondary/40 px-2 py-1.5 text-right text-muted-foreground">
                  {formatByFmt(w, "pct2")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rowValues.map((rowVal, r) => (
              <tr key={r}>
                <td className="border border-border/60 bg-secondary/20 px-2 py-1.5 text-muted-foreground">
                  {formatByFmt(rowVal, rowFmt)}
                </td>
                {table.grid[r].map((cell, c) => (
                  <td
                    key={c}
                    className={cn(
                      "border border-border/60 px-2 py-1.5 text-right tabular-nums",
                      r === centerRow && c === centerCol ? "bg-blue-600/15 font-semibold text-blue-600" : "text-foreground",
                    )}
                  >
                    {cell == null ? "n/a" : formatByFmt(cell, "price", currency)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
