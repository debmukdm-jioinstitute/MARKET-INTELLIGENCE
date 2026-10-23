import { fmtVal, type Fmt } from "@/lib/ts-charts/format";

type Payload = { dataKey: string; name: string; value: number | null; color: string };
export function TsTooltip({ active, payload, label, fmt, digits }: { active?: boolean; payload?: Payload[]; label?: string; fmt: Fmt; digits: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--rule)", borderRadius: 4, padding: "7px 10px", fontSize: 13, color: "var(--ink)" }}>
      <div style={{ color: "var(--ink-3)" }}>{label}</div>
      {payload.filter((p) => p.value != null).map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span style={{ width: 12, height: 2, background: p.color }} />
          {p.name}
          <b className="ml-auto pl-3">{fmtVal(p.value, fmt, digits)}</b>
        </div>
      ))}
    </div>
  );
}
