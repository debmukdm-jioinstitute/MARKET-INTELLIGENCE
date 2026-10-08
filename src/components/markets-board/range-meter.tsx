import { rangePosition } from "@/components/markets-board/format";

export function RangeMeter({
  label,
  price,
  low,
  high,
}: {
  label: string;
  price: number | null;
  low: number | null;
  high: number | null;
}) {
  const pct = rangePosition(price, low, high);
  const now = price ?? undefined;
  const text =
    pct != null && price != null
      ? `Current price ${price} is at ${Math.round(pct)}% of ${label}`
      : "Range unavailable";
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={low ?? undefined}
      aria-valuemax={high ?? undefined}
      aria-valuenow={now}
      aria-valuetext={text}
      className="relative h-1.5 w-full rounded-full bg-[#E5E5E1]"
    >
      {pct != null ? (
        <span
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#151515] shadow-xs transition-all duration-200"
          style={{ left: `${pct}%` }}
        />
      ) : null}
    </div>
  );
}
