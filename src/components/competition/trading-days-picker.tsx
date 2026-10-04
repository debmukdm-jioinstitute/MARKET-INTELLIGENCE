"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isWeekend,
  startOfMonth,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

type Props = {
  value: string[];
  onChange: (dates: string[]) => void;
  maxDates?: number;
  required?: boolean;
};

export function TradingDaysPicker({ value, onChange, maxDates = 5, required }: Props) {
  const selected = useMemo(() => [...value].sort(), [value]);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const leadingBlanks = (getDayMonFirst(cursor) + 7) % 7;

  function toggle(day: Date) {
    const iso = toIso(day);
    if (selected.includes(iso)) {
      onChange(selected.filter((d) => d !== iso));
      return;
    }
    if (selected.length >= maxDates) return;
    onChange([...selected, iso].sort());
  }

  function isSelected(day: Date) {
    return selected.some((iso) => isSameDay(day, parseIso(iso)));
  }

  const triggerLabel =
    selected.length === 0
      ? `Select ${maxDates} trading dates`
      : `${selected.length} of ${maxDates} selected`;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-10 w-full justify-start gap-2 rounded-full px-4 py-2.5 font-normal"
            aria-required={required}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex flex-1 flex-wrap gap-1.5 text-left text-sm">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">{triggerLabel}</span>
              ) : (
                selected.map((iso) => (
                  <span
                    key={iso}
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground"
                  >
                    {iso}
                  </span>
                ))
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,20rem)] p-3" align="start">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous month"
              onClick={() => setCursor((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold">{format(cursor, "MMMM yyyy")}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => setCursor((m) => addMonths(m, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[0.65rem] font-medium text-muted-foreground">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <span key={`pad-${i}`} />
            ))}
            {monthDays.map((day) => {
              const picked = isSelected(day);
              const atMax = selected.length >= maxDates && !picked;
              const weekend = isWeekend(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={!isSameMonth(day, cursor) || atMax}
                  onClick={() => toggle(day)}
                  className={cn(
                    "aspect-square rounded-md text-sm transition-colors",
                    !isSameMonth(day, cursor) && "invisible",
                    picked && "bg-primary font-semibold text-primary-foreground",
                    !picked && !atMax && "hover:bg-muted",
                    atMax && "opacity-40",
                    weekend && !picked && "text-muted-foreground",
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Click days to toggle. Pick exactly {maxDates} session dates (usually Mon–Fri, skip NSE holidays).
          </p>
          {selected.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => onChange([])}
            >
              Clear all
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
      {required && selected.length > 0 && selected.length < maxDates ? (
        <p className="text-xs text-muted-foreground">
          {maxDates - selected.length} more date{maxDates - selected.length === 1 ? "" : "s"} needed.
        </p>
      ) : null}
    </div>
  );
}

/** Monday = 0 … Sunday = 6 */
function getDayMonFirst(d: Date): number {
  return (d.getDay() + 6) % 7;
}
