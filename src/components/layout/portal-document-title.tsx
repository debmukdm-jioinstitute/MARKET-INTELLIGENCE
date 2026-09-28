"use client";

import { portalDocumentTitle } from "@/lib/portal/route-titles";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Task-specific `document.title` after sign-in (browser history + screen reader context). */
export function PortalDocumentTitle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    document.title = portalDocumentTitle(pathname, searchParams);
  }, [pathname, searchParams]);

  return null;
}
