"use client";
import useSWR from "swr";

type Ev = { id: string; kind: string; symbol: string | null; title: string; event_date: string };
const load = (u: string): Promise<Ev[]> => fetch(u).then((r) => (r.ok ? r.json() : []));
const iso = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);

/** Upcoming exchange holidays and corporate actions. Empty state is explicit, never filler. */
export function TsEvents({ days = 14, title = "This week" }: { days?: number; title?: string }) {
  const from = iso(0), to = iso(days);
  const { data, isLoading } = useSWR(`/api/ts/events?from=${from}&to=${to}`, load, { revalidateOnFocus: false });
  const byDate = new Map<string, Ev[]>();
  for (const e of data ?? []) (byDate.get(e.event_date) ?? byDate.set(e.event_date, []).get(e.event_date)!).push(e);
  return (
    <section aria-label={title} className="space-y-2" style={{ color: "var(--ink)" }}>
      <h3 className="text-base font-semibold">{title}</h3>
      {isLoading ? <div className="h-16 animate-pulse rounded" style={{ background: "var(--paper-2)" }} />
        : byDate.size === 0 ? <p className="text-sm" style={{ color: "var(--ink-3)" }}>No holidays or corporate actions stored for the next {days} days.</p>
        : (
          <ul className="space-y-2 text-sm">
            {[...byDate].map(([d, evs]) => (
              <li key={d} className="border-t pt-2" style={{ borderColor: "var(--rule)" }}>
                <div className="font-medium tabular-nums">{d}</div>
                <ul className="mt-1 space-y-0.5">
                  {evs.slice(0, 12).map((e) => (
                    <li key={e.id} className="flex gap-2"><span className="w-20 shrink-0 text-xs uppercase" style={{ color: "var(--ink-3)" }}>{e.kind}</span><span>{e.symbol ? <b>{e.symbol} </b> : null}{e.title}</span></li>
                  ))}
                  {evs.length > 12 && <li className="text-xs" style={{ color: "var(--ink-3)" }}>+{evs.length - 12} more</li>}
                </ul>
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
