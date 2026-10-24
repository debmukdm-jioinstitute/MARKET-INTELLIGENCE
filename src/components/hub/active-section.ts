"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const EVENT = "hub-section";

/** The hub jump chips announce which section is on screen, so menus can highlight the matching item instead of the hub's first one. */
export function publishHubSection(id: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

/** Section currently in view on a hub page, or null elsewhere. Resets when the route changes. */
export function useActiveHubSection(): string | null {
  const path = usePathname();
  const [state, setState] = useState<{ path: string; id: string } | null>(null);
  useEffect(() => {
    const on = (e: Event) => setState({ path, id: (e as CustomEvent<string>).detail });
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [path]);
  return state?.path === path ? state.id : null;
}
