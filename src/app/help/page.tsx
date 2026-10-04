import { HelpGuide } from "@/components/help/help-guide";
import { buildHelpMcpToolRows } from "@/lib/help/mcp-tool-guide";
import { MCP_ACCOUNT_TOOLS, PORTAL_ONLY_UI, helpSitemapSections } from "@/lib/help/site-guide";
import { pageMetadata } from "@/lib/seo/metadata";
import { SemanticSearchBox } from "@/components/ui/semantic-search-box";
import { PublicHeader } from "@/components/layout/public-header";
import Link from "next/link";

/** Static guide content — refresh hourly; MCP tool list changes rarely. */
export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Help Centre",
  description:
    "Investor tasks, MCP setup, and step-by-step mi terminal install for Mac, Windows, and Linux.",
  path: "/help",
});

export default function HelpPage() {
  const tools = buildHelpMcpToolRows();
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicHeader backHref="/" backLabel="Home" />
      <main className="mx-auto max-w-6xl flex-1 px-4 sm:px-6 py-10 sm:py-16 text-sm leading-relaxed text-foreground w-full">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-600 font-bold">Market Intelligence · Help</p>
        <h1 className="mb-3 text-2xl sm:text-3xl font-bold tracking-tight">Help center</h1>
        <p className="max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed">
          Start with everyday investor tasks below. Developer setup for <b className="font-semibold text-foreground">Connect your AI</b>{" "}
          (MCP) is in its own section — you do not need it to search a stock or read a chart in the browser. For the{" "}
          <Link href="/help#terminal" className="font-semibold text-blue-600 hover:underline">
            mi terminal app
          </Link>
          , open <b className="font-semibold text-foreground">Market Intelligence terminal (mi)</b> →{" "}
          <b className="font-semibold text-foreground">How to set up in terminal</b> (Mac, Windows, or Linux).
        </p>
        <p className="mt-4"><Link href="/alpha-league" className="text-primary underline">The Alpha League</Link>: virtual portfolio championship. The read-only <b>get_alpha_league_preview</b> MCP tool provides public top-20 standings in the terminal. No personal holdings or trades are exposed.</p>
        <div className="mt-6 max-w-xl">
          <SemanticSearchBox corpus="help" placeholder="Search help topics (e.g. how do I connect Claude)" />
        </div>
        <div className="mt-8">
          <HelpGuide
            tools={tools}
            sitemapSectionCount={helpSitemapSections().length}
            accountTools={MCP_ACCOUNT_TOOLS}
            portalOnly={PORTAL_ONLY_UI}
          />
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
            ← Back to Home
          </Link>
          <Link href="/Home" className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-600/90 transition-all hover:scale-105 active:scale-95">
            Open Terminal →
          </Link>
        </div>
      </main>
    </div>
  );
}
