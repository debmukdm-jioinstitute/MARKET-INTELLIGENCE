import Link from "next/link";

/** Sitewide launch strip — Claude MCP connect guide. */
export function McpClaudeLaunchBanner() {
  return (
    <div
      role="region"
      aria-label="Product announcement"
      className="border-b border-white/20 bg-gradient-to-r from-violet-700 via-blue-600 to-cyan-600 text-white shadow-[0_4px_24px_-8px_rgba(37,99,235,0.55)]"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-2 px-4 py-2.5 text-center sm:flex-row sm:flex-wrap sm:gap-x-3 sm:py-3">
        <p className="text-sm leading-snug sm:text-[15px]">
          <span className="font-semibold">🤖 Market Intelligence MCP for Claude</span> is live — NSE/BSE data,
          portfolio, screeners &amp; research inside Claude Desktop &amp; Claude Code.
        </p>
        <Link
          href="/connect/claude"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/35 bg-white/15 px-3.5 py-1 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          ✨ Setup guide
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
