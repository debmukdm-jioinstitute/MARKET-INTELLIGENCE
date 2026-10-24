"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MiMascot } from "./mi-mascot";
import { useMascotOverride } from "./mascot-bus";
import { portalTipFor } from "./mascot-tips";

/** Site-wide guide. Mounts on first user interaction so it never competes with first paint or LCP. */
export function PortalMascot() {
  const pathname = usePathname() ?? "";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const onInteract = () => setMounted(true);
    window.addEventListener("scroll", onInteract, { once: true, passive: true });
    window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
    window.addEventListener("keydown", onInteract, { once: true, passive: true });
    return () => {
      window.removeEventListener("scroll", onInteract);
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  const override = useMascotOverride();
  if (!mounted || pathname === "/" || pathname.startsWith("/admin") || pathname.startsWith("/loader-preview")) return null;
  const tip = override?.tip ?? portalTipFor(pathname);
  return <MiMascot tip={tip} tipKey={override?.key ?? pathname} />;
}
