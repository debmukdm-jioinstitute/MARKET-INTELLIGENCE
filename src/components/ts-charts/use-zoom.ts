"use client";
import { useMemo, useRef, useState } from "react";

/** Desktop drag-select zoom; touch pinch + pan; double-tap resets. */
export function useZoom<T extends { date: string }>(rows: T[]) {
  const [win, setWin] = useState<[number, number] | null>(null);
  const [sel, setSel] = useState<[string, string] | null>(null);
  const t = useRef<{ d0: number; w0: [number, number]; x0: number; last: number } | null>(null);
  const data = useMemo(() => (win ? rows.slice(win[0], win[1] + 1) : rows), [rows, win]);
  const idx = (d: string) => rows.findIndex((r) => r.date === d);

  const mouseHandlers = {
    onMouseDown: (e: { activeLabel?: string | number }) => { if (e?.activeLabel) setSel([String(e.activeLabel), String(e.activeLabel)]); },
    onMouseMove: (e: { activeLabel?: string | number }) => { if (sel && e?.activeLabel) setSel([sel[0], String(e.activeLabel)]); },
    onMouseUp: () => {
      if (sel) {
        const [a, b] = [idx(sel[0]), idx(sel[1])].sort((x, y) => x - y);
        if (b - a > 2) setWin([a, b]);
      }
      setSel(null);
    },
  };
  const touchHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      const now = Date.now();
      const w: [number, number] = win ?? [0, rows.length - 1];
      if (e.touches.length === 1 && t.current && now - t.current.last < 300) { setWin(null); t.current = null; return; }
      t.current = { d0: e.touches.length === 2 ? Math.abs(e.touches[0].clientX - e.touches[1].clientX) : 0, w0: w, x0: e.touches[0].clientX, last: now };
    },
    onTouchMove: (e: React.TouchEvent) => {
      const s = t.current;
      if (!s) return;
      const [a, b] = s.w0;
      const span = b - a;
      const W = (e.currentTarget as HTMLElement).clientWidth || 1;
      if (e.touches.length === 2 && s.d0) {
        const d = Math.abs(e.touches[0].clientX - e.touches[1].clientX) || 1;
        const ns = Math.max(10, Math.round((span * s.d0) / d));
        const mid = Math.round((a + b) / 2);
        const na = Math.max(0, Math.round(mid - ns / 2));
        setWin([na, Math.min(rows.length - 1, na + ns)]);
      } else if (e.touches.length === 1 && win) {
        const shift = Math.round(((s.x0 - e.touches[0].clientX) / W) * span);
        const na = Math.min(Math.max(0, a + shift), rows.length - 1 - span);
        setWin([na, na + span]);
      }
    },
  };
  return { data, sel, zoomed: !!win, reset: () => setWin(null), mouseHandlers, touchHandlers };
}
