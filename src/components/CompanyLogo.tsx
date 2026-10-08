"use client";

import { useState } from "react";
import { logoUrl } from "@/lib/company-logo";

const FALLBACK_COLORS = ["#2563eb", "#7c3aed", "#0d9488", "#d97706", "#db2777", "#4f46e5", "#059669", "#dc2626"];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length]!;
}

/**
 * The only way a company logo renders. Plain <img> from /public/logos (never next/image — the optimizer costs
 * function invocations). White circle so dark-on-transparent logos stay visible in dark mode; letter avatar
 * when no logo exists or the file fails to load. Fixed size: never shifts layout.
 */
export function CompanyLogo({ symbol, name, size = 28 }: { symbol: string | null | undefined; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = logoUrl(symbol);
  const box = { width: size, height: size, minWidth: size } as const;

  if (!src || failed) {
    return (
      <span
        aria-hidden
        className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white"
        style={{ ...box, background: colorFor(name || symbol || "?"), fontSize: Math.max(10, Math.round(size * 0.44)) }}
      >
        {(name || symbol || "?").trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/10"
      style={{ ...box, padding: Math.round(size * 0.15) }}
    >
      <img
        src={src}
        alt={`${name} logo`}
        loading="lazy"
        decoding="async"
        width={size}
        height={size}
        className="size-full object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
