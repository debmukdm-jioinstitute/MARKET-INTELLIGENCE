export type Fmt = "pct" | "pp" | "bps" | "x" | "rs" | "crore" | "count" | "ratio" | "int" | "days" | "num";

export const fmtVal = (v: number | null | undefined, f: Fmt = "num", d = 1): string => {
  if (v == null || !Number.isFinite(v)) return "–";
  const inr = (n: number) => v.toLocaleString("en-IN", { maximumFractionDigits: n });
  switch (f) {
    case "pct": return `${v.toFixed(d)}%`;
    case "pp": return `${v.toFixed(d)} pp`;
    case "bps": return `${Math.round(v)} bps`;
    case "x": return `${v.toFixed(d)}x`;
    case "rs": return `₹${inr(d)}`;
    case "crore": return `₹${inr(0)} cr`;
    case "count":
    case "int": return inr(0);
    case "days": return `${v.toFixed(d)} days`;
    default: return v.toFixed(d);
  }
};
