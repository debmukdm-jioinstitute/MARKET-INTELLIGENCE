"use client";

import { usePathname } from "next/navigation";
import { MiMascot } from "./mi-mascot";
import { portalTipFor } from "./mascot-tips";

export function PortalMascot() {
  const pathname = usePathname() ?? "";
  return <MiMascot tip={portalTipFor(pathname)} tipKey={pathname} />;
}
