"use client";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type State = { preset: string; from?: string; to?: string };
type R = State & { set: (p: string, from?: string, to?: string) => void };
const Ctx = createContext<R | null>(null);
const NOOP: R = { preset: "All", set: () => {} };

export const yearsAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
};
const fromPreset = (p: string) => (p === "All" || p === "custom" ? undefined : yearsAgo(parseInt(p)));

export function RangeProvider({ children, initial = "5Y" }: { children: ReactNode; initial?: string }) {
  const [s, setS] = useState<State>({ preset: initial, from: fromPreset(initial) });
  const set = useCallback((preset: string, from?: string, to?: string) => setS({ preset, from: from ?? fromPreset(preset), to }), []);
  const v = useMemo(() => ({ ...s, set }), [s, set]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export const useRange = () => useContext(Ctx) ?? NOOP;
