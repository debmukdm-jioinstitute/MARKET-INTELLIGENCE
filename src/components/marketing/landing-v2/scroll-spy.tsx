"use client";

import { LANDING_SECTIONS } from "@/lib/marketing/landing-v2/copy";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function LandingScrollSpy() {
  const [active, setActive] = useState<string>("hero");

  useEffect(() => {
    const ids = LANDING_SECTIONS.map((s) => s.id);
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.12, 0.35, 0.6] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2 lg:flex"
    >
      {LANDING_SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="group flex items-center justify-end gap-2"
          aria-current={active === s.id ? "true" : undefined}
        >
          <span className="sr-only">{s.label}</span>
          <span
            className={cn(
              "size-2 rounded-full border border-[#c45c26] transition",
              active === s.id ? "bg-[#c45c26]" : "bg-transparent group-hover:bg-[#c45c26]/40",
            )}
          />
        </a>
      ))}
    </nav>
  );
}
