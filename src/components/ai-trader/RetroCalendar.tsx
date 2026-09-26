"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarDate {
  day: string;
  bars: number;
  ticks?: number;
}

interface RetroCalendarProps {
  dates: CalendarDate[];
  selectedDate: string;
  onSelect: (date: string) => void;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export default function RetroCalendar({ dates, selectedDate, onSelect }: RetroCalendarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const barMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of dates) m[d.day] = d.bars;
    return m;
  }, [dates]);
  const tickMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of dates) if (d.ticks) m[d.day] = d.ticks;
    return m;
  }, [dates]);

  const initialMonth = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: (null | { date: string; day: number; bars: number | null; ticks: number | null })[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date: ds, day: d, bars: barMap[ds] ?? null, ticks: tickMap[ds] ?? null });
    }
    return cells;
  }, [viewYear, viewMonth, barMap, tickMap]);

  const monthName = new Date(viewYear, viewMonth).toLocaleString("en-IN", { month: "long", year: "numeric" });
  const todayIso = new Date().toISOString().slice(0, 10);

  const selectedLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "Select date";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="t-btn inline-flex items-center gap-2 text-sm font-medium normal-case tracking-normal"
      >
        <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
        <span className="text-foreground">{selectedLabel}</span>
        {selectedDate && barMap[selectedDate] !== undefined ? (
          <span className="text-xs text-muted-foreground">({barMap[selectedDate]} bars)</span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose chart date"
          className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
            <button type="button" onClick={prevMonth} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">{monthName}</span>
            <button type="button" onClick={nextMonth} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0 px-2 pt-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 px-2 pb-3">
            {calendarDays.map((cell, i) => {
              if (!cell) return <div key={`e-${i}`} aria-hidden />;

              const hasData = cell.bars !== null || cell.ticks !== null;
              const hasTicks = cell.ticks !== null && cell.ticks > 0;
              const isSelected = cell.date === selectedDate;
              const isToday = cell.date === todayIso;

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => {
                    if (hasData) {
                      onSelect(cell.date);
                      setOpen(false);
                    }
                  }}
                  disabled={!hasData}
                  className={cn(
                    "flex min-h-[2.75rem] flex-col items-center justify-center rounded-lg border px-0.5 py-1 text-sm transition-colors",
                    !hasData && "cursor-default border-transparent text-muted-foreground/45",
                    hasData && !isSelected && "border-border bg-background text-foreground hover:border-primary/40 hover:bg-accent",
                    isSelected && "border-chart-2 bg-chart-2 font-semibold text-primary-foreground shadow-sm",
                    isToday && !isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                  )}
                >
                  <span className="tabular-nums">{cell.day}</span>
                  {hasData ? (
                    <div className="mt-0.5 flex items-center gap-0.5">
                      {cell.bars !== null && cell.bars > 0 ? (
                        <span className={cn("text-[9px] font-medium tabular-nums", isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>
                          {cell.bars}
                        </span>
                      ) : null}
                      {hasTicks ? (
                        <span className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-primary-foreground/80" : "bg-chart-3")} title="Tick data" />
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded border border-border bg-background" />
              Has data
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-chart-3" />
              Ticks
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-chart-2" />
              Selected
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded ring-2 ring-primary" />
              Today
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
