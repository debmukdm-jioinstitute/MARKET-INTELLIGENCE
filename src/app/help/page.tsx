import { HelpGuide } from "@/components/help/help-guide";
import { buildHelpMcpToolRows } from "@/lib/help/mcp-tool-guide";
import { MCP_ACCOUNT_TOOLS, PORTAL_ONLY_UI, helpSitemapSections } from "@/lib/help/site-guide";

/** Static guide content — refresh hourly; MCP tool list changes rarely. */
export const revalidate = 3600;

export const metadata = {
  title: "Help · Setup guide · Market Intelligence",
  description:
    "Step-by-step help for the website, Claude custom connector (MCP OAuth), Cursor, terminal mi, portfolio in AI, and troubleshooting.",
};

export default function HelpPage() {
  const tools = buildHelpMcpToolRows();
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-sm leading-relaxed text-foreground">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-600">Market Intelligence · Help</p>
      <h1 className="mb-3 text-3xl font-semibold">Help center</h1>
      <p className="text-base text-muted-foreground">
        Pick a section below. <b className="font-semibold text-foreground">Claude on the web</b> uses a custom connector plus a
        one-time <b className="font-semibold text-foreground">Allow access</b> screen (automatic sign-in — not your website
        password). <b className="font-semibold text-foreground">Cursor</b> only needs the MCP link pasted once. No API keys to
        email us for market data.
      </p>
      <div className="mt-8">
        <HelpGuide
          tools={tools}
          sitemapSectionCount={helpSitemapSections().length}
          accountTools={MCP_ACCOUNT_TOOLS}
          portalOnly={PORTAL_ONLY_UI}
        />
      </div>
    </main>
  );
}
