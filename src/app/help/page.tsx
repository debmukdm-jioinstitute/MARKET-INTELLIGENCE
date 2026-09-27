import { HelpGuide } from "@/components/help/help-guide";
import { buildHelpMcpToolRows } from "@/lib/help/mcp-tool-guide";
import { CRONS, MCP_ACCOUNT_TOOLS, PORTAL_ONLY_UI, helpSitemapSections } from "@/lib/help/site-guide";

export const metadata = {
  title: "Help · Easy setup guide · Market Intelligence",
  description:
    "Step-by-step help for the website, connecting AI (MCP) with no API key, optional terminal mi, and troubleshooting — written for non-technical users.",
};

export default function HelpPage() {
  const tools = buildHelpMcpToolRows();
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-sm leading-relaxed text-foreground">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-600">Market Intelligence · Help</p>
      <h1 className="mb-3 text-3xl font-semibold">Help center</h1>
      <p className="text-base text-muted-foreground">
        Open a section below for step-by-step instructions. Connecting your AI takes about two minutes and does not require an
        API key.
      </p>
      <div className="mt-8">
        <HelpGuide
          tools={tools}
          sitemapSectionCount={helpSitemapSections().length}
          accountTools={MCP_ACCOUNT_TOOLS}
          portalOnly={PORTAL_ONLY_UI}
          crons={[...CRONS]}
        />
      </div>
    </main>
  );
}
