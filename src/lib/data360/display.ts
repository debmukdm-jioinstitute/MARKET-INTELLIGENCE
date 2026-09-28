const UNIT_LABELS: Record<string, string> = {
  PC_A: "Percent (annual change)",
  PC: "Percent",
  PT: "Percent",
  USD: "US dollars",
  INR: "Indian rupees",
  IX: "Index",
  PURE_NUMBER: "Number",
};

/** User-readable label for World Bank / SDMX unit codes stored on observations. */
export function formatData360Unit(code: string | null | undefined): string {
  if (!code?.trim()) return "—";
  const key = code.trim().toUpperCase();
  return UNIT_LABELS[key] ?? code.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Round stored observation values for display (avoid six-decimal GDP noise). */
export function formatData360ObsValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  if (abs >= 1) return value.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  return value.toLocaleString("en-IN", { maximumFractionDigits: 4 });
}
