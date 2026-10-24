"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type HubChip = { id: string; label: string };

/** Sticky jump chips with scroll-spy. Tap targets are at least 44px on touch screens. */
export function HubJumpNav({ chips, onJump, label }: { chips: HubChip[]; onJump?: (id: string) => void; label: string }) {
  const [active, setActive] = useState(chips[0]?.id ?? "");
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = chips.map((c) => document.getElementById(c.id)).filter((e): e is HTMLElement => Boolean(e));
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-110px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [chips]);

  useEffect(() => {
    const btn = bar.current?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    btn?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);

  const jump = (id: string) => {
    onJump?.(id);
    setActive(id);
    // Wait a frame so an eagerly mounted section exists before scrolling.
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      window.history.replaceState(null, "", `${window.location.pathname}#${id}`);
    });
  };

  return (
    <nav aria-label={`${label} sections`} className="sticky top-14 z-30 -mx-3 border-b border-border bg-background/95 px-3 backdrop-blur-md sm:-mx-4 sm:px-4 md:-mx-5 md:px-5">
      <div ref={bar} className="flex gap-1.5 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            data-chip={c.id}
            aria-current={active === c.id ? "true" : undefined}
            onClick={() => jump(c.id)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors touch-manipulation sm:min-h-9",
              active === c.id ? "border-primary/40 bg-accent text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
