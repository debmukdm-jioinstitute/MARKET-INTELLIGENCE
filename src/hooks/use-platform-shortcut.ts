"use client";

import { useEffect, useState } from "react";

export interface PlatformShortcut {
  /** "⌘K" on Mac/Apple, "Ctrl K" on Windows/Linux/Other */
  label: string;
  /** "⌘" on Mac, "Ctrl" on Windows/Linux */
  modifier: string;
  /** "K" */
  key: string;
  /** True if macOS, iOS, iPadOS */
  isMac: boolean;
  /** True if mobile phone or touch screen */
  isMobile: boolean;
  /** Ready after client hydration */
  mounted: boolean;
}

export function usePlatformShortcut(): PlatformShortcut {
  const [state, setState] = useState<PlatformShortcut>({
    label: "⌘K",
    modifier: "⌘",
    key: "K",
    isMac: true,
    isMobile: false,
    mounted: false,
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const nav = navigator as {
      userAgentData?: { platform?: string };
      platform?: string;
      userAgent?: string;
    };
    const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || "";
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(platform);
    const isMobile =
      /(Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini)/i.test(
        nav.userAgent || ""
      ) ||
      (typeof window !== "undefined" && "ontouchstart" in window && window.innerWidth < 1024);

    setState({
      label: isMac ? "⌘K" : "Ctrl K",
      modifier: isMac ? "⌘" : "Ctrl",
      key: "K",
      isMac,
      isMobile,
      mounted: true,
    });
  }, []);

  return state;
}
