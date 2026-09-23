"use client";

import { MACRO_SECTIONS } from "@/lib/macro/sections-meta";
import Link from "next/link";

export function SectionNavGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {MACRO_SECTIONS.filter((s) => s.id !== "regime").map((s) => (
        <Link
          key={s.id}
          href={s.href}
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:shadow-lg"
        >
          <div
            className="absolute inset-y-0 left-0 w-1 opacity-80"
            style={{ background: s.accent }}
          />
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Section</p>
          <h3 className="mt-1 font-heading text-lg group-hover:text-primary">{s.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.subtitle}</p>
        </Link>
      ))}
    </div>
  );
}
