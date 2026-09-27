/** Simplified brand marks for setup guides (not official assets). */
export function ClaudeBrandIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Claude">
      <rect width="48" height="48" rx="12" fill="#CC785C" />
      <path
        fill="#FAF9F5"
        d="M24 10c-1.2 3.2-2.4 5.4-4.2 7.8-2.2 2.8-4.6 4.4-7.8 5.6 3.2 1.2 5.4 2.4 7.8 4.2 2.8 2.2 4.4 4.6 5.6 7.8 1.2-3.2 2.4-5.4 4.2-7.8 2.2-2.8 4.6-4.4 7.8-5.6-3.2-1.2-5.4-2.4-7.8-4.2-2.8-2.2-4.4-4.6-5.6-7.8z"
      />
    </svg>
  );
}

export function CursorBrandIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Cursor">
      <rect width="48" height="48" rx="12" fill="#0B0B0B" />
      <path
        fill="#FFFFFF"
        d="M14 12l4 22 4.5-6.5L28 32l3-2.2-5.5-4.2L34 14 14 12z"
      />
    </svg>
  );
}

export function McpLinkIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="MCP connection">
      <rect width="48" height="48" rx="12" fill="#2563EB" fillOpacity="0.12" stroke="#2563EB" strokeWidth="1.5" />
      <path
        stroke="#2563EB"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        d="M12 24h8m8 0h8M24 12v8m0 8v8"
      />
      <circle cx="24" cy="24" r="4" fill="#2563EB" />
    </svg>
  );
}

export function MarketIntelligenceBrandMark({ className = "h-10 w-auto" }: { className?: string }) {
  return (
    <img src="/logo.png" alt="Market Intelligence" className={`${className} dark:invert`} />
  );
}
