"use client";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

/** Renders children once the section is near the viewport (or forced). Keeps long hubs light: heavy embedded pages mount on demand. */
function Deferred({ children, force, minHeight }: { children: ReactNode; force: boolean; minHeight: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  const on = near || force;
  return (
    <div ref={ref} style={{ minHeight: on ? undefined : minHeight }}>
      {on ? (
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted/50" aria-hidden />}>{children}</Suspense>
      ) : null}
    </div>
  );
}

export function HubSection({ id, title, fullHref, force = false, minHeight = 320, children }: { id: string; title: string; fullHref?: string; force?: boolean; minHeight?: number; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28 border-t border-border pt-6 first:border-t-0 first:pt-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {fullHref ? (
          <Link href={fullHref} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border px-3 text-sm font-medium text-primary hover:bg-accent">
            Open full page <ArrowUpRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>
      <Deferred force={force} minHeight={minHeight}>{children}</Deferred>
    </section>
  );
}

/** Call-to-action card for tools that stay full-screen (scanner, Trade Lab, AI Desk, options flow). */
export function HubCta({ href, title, text, cta }: { href: string; title: string; text: string; cta: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{text}</p>
      </div>
      <Link href={href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
        {cta} <ArrowUpRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

/** Sub-heading with its own anchor, for clusters inside one section (e.g. promoters / credit / legal under company stress). */
export function HubSub({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-28 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}
