"use client";

import { usePathname } from "next/navigation";
import { MiMascot } from "./mi-mascot";
import { useMascotOverride } from "./mascot-bus";
import { portalTipFor } from "./mascot-tips";

/** Site-wide guide. Landing ("/") has its own section-aware mascot; admin and bare loaders get none. */
export function PortalMascot() {
  const pathname = usePathname() ?? "";
  const override = useMascotOverride();
  if (pathname === "/" || pathname.startsWith("/admin") || pathname.startsWith("/loader-preview")) return null;
  const tip = override?.tip ?? portalTipFor(pathname);
  return <MiMascot tip={tip} tipKey={override?.key ?? pathname} />;
}
