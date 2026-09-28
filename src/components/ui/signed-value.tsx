import { cn } from "@/lib/utils";

const MINUS = "−";

/**
 * Direction is never colour alone: explicit +/− sign plus a ▲/▼ glyph.
 * One negative convention everywhere (true minus, no parentheses).
 */
export function formatSignedPct(fraction: number, digits = 2): string {
  const abs = Math.abs(fraction * 100).toFixed(digits);
  if (fraction > 0) return `+${abs}%`;
  if (fraction < 0) return `${MINUS}${abs}%`;
  return `${abs}%`;
}

export function SignedPct({
  value,
  digits = 2,
  className,
  label,
}: {
  /** Fraction, e.g. 0.0123 for +1.23%. */
  value: number | null | undefined;
  digits?: number;
  className?: string;
  /** Text appended, e.g. "today". */
  label?: string;
}) {
  if (value == null || Number.isNaN(value)) return <span className={cn("text-muted-foreground", className)}>n/a</span>;
  const dir = value > 0 ? "up" : value < 0 ? "down" : "flat";
  return (
    <span
      className={cn(
        "tabular-nums",
        dir === "up" && "text-emerald-600",
        dir === "down" && "text-rose-600",
        dir === "flat" && "text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden>{dir === "up" ? "▲" : dir === "down" ? "▼" : "■"} </span>
      <span className="sr-only">{dir === "up" ? "Up " : dir === "down" ? "Down " : "Unchanged "}</span>
      {formatSignedPct(value, digits)}
      {label ? ` ${label}` : ""}
    </span>
  );
}
