"use client";

import type { BriefingSeed } from "@/lib/macro/build-tape";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "mi_macro_last_visit_v1";

type Stored = BriefingSeed & { at: string };

export type BriefingItem = {
  n: string;
  text: string;
  href: string;
};

function buildItems(seed: BriefingSeed, prev: Stored | null): BriefingItem[] {
  const items: BriefingItem[] = [];

  if (seed.fiiNetToday != null) {
    const worse = prev?.fiiNetToday != null && seed.fiiNetToday < prev.fiiNetToday;
    const label =
      seed.fiiNetToday < 0
        ? worse
          ? "FII selling increased — net outflow today."
          : "FII net selling in the latest NSE session."
        : "FII net buying in the latest NSE session.";
    items.push({ n: "01", text: label, href: "/Home" });
  } else {
    items.push({
      n: "01",
      text: "Check FII/DII flows on the India dashboard.",
      href: "/Home",
    });
  }

  if (seed.gsec10y != null) {
    const up = (seed.gsec10yChgPct ?? 0) > 0.0005;
    const down = (seed.gsec10yChgPct ?? 0) < -0.0005;
    items.push({
      n: "02",
      text: up
        ? `10Y G-Sec yield moved higher (${seed.gsec10y.toFixed(2)}%).`
        : down
          ? `10Y G-Sec yield eased (${seed.gsec10y.toFixed(2)}%).`
          : `10Y G-Sec steady at ${seed.gsec10y.toFixed(2)}%.`,
      href: "/macro/yields",
    });
  }

  if (seed.itVsNifty1d != null) {
    const under = seed.itVsNifty1d < -0.002;
    const out = seed.itVsNifty1d > 0.002;
    items.push({
      n: "03",
      text: out
        ? "IT sector outperformed NIFTY today."
        : under
          ? "IT sector underperformed NIFTY."
          : "IT sector in line with NIFTY.",
      href: "/research/%5ECNXIT",
    });
  } else {
    items.push({
      n: "03",
      text: "Review NIFTY IT vs benchmark on research.",
      href: "/research/%5ECNXIT",
    });
  }

  items.push({
    n: "04",
    text: "Review your holdings for earnings and news.",
    href: "/portfolio",
  });

  if (seed.brentChgPct != null) {
    items.push({
      n: "05",
      text: `Crude oil ${seed.brentChgPct >= 0 ? "rose" : "fell"} ${Math.abs(seed.brentChgPct * 100).toFixed(1)}%.`,
      href: "/macro/commodities#brent",
    });
  } else {
    items.push({
      n: "05",
      text: "Open the commodity dashboard for Brent and metals.",
      href: "/macro/commodities",
    });
  }

  if (prev && seed.usdInrChgPct != null && Math.abs(seed.usdInrChgPct - (prev.usdInrChgPct ?? 0)) > 0.001) {
    items[4] = {
      n: "05",
      text: `USD/INR moved — Rupee ${seed.usdInrChgPct > 0 ? "weaker" : "stronger"} vs last visit.`,
      href: "/macro/currency#usd_inr",
    };
  }

  return items.slice(0, 5);
}

export function WhatChangedCard({ seed }: { seed: BriefingSeed }) {
  const [prev, setPrev] = useState<Stored | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrev(JSON.parse(raw) as Stored);
    } catch {
      setPrev(null);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...seed, at: new Date().toISOString() }));
      } catch {
        /* ignore */
      }
    }, 8000);
    return () => window.clearTimeout(t);
  }, [seed]);

  const items = useMemo(() => buildItems(seed, prev), [seed, prev]);
  const firstVisit = !prev;

  return (
    <section className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-6 shadow-lg">
      <p className="text-sm uppercase tracking-[0.28em] text-primary">Morning briefing</p>
      <h2 className="mt-1 font-heading text-2xl md:text-3xl">What changed since you last visited?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {firstVisit
          ? "First visit — we’ll personalize this list next time. Five links to the underlying data."
          : "Five important moves — each line opens the source view."}
      </p>
      <ol className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item.n}>
            <Link
              href={item.href}
              className="group flex gap-3 rounded-lg border border-border/60 bg-background/60 px-4 py-3 transition hover:border-primary/50 hover:bg-background"
            >
              <span className="text-lg text-primary">{item.n}</span>
              <span className="text-sm leading-snug group-hover:text-primary">{item.text}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
