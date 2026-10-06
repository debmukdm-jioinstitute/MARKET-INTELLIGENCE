"use client";

import { useEffect, useState } from "react";
import { MiMascot } from "./mi-mascot";
import { LANDING_TIPS } from "./mascot-tips";

const IDS = Object.keys(LANDING_TIPS);

/** Follows the visitor down the landing page and comments on whichever section is in view. */
export function LandingMascot() {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const ratios = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best = "";
        let bestRatio = 0;
        ratios.forEach((r, id) => {
          if (r > bestRatio) {
            best = id;
            bestRatio = r;
          }
        });
        if (best) setActive(best);
      },
      { threshold: [0.15, 0.35, 0.6, 0.85], rootMargin: "-10% 0px -30% 0px" },
    );
    for (const id of IDS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return <MiMascot tip={LANDING_TIPS[active] ?? LANDING_TIPS.hero} tipKey={active} />;
}
