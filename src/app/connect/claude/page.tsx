import { PublicHeader } from "@/components/layout/public-header";
import { ClaudeConnectorClient } from "@/components/help/claude-connector-client";
import { CLAUDE_CONNECTOR } from "@/lib/mcp/connector-public";
import Link from "next/link";

export const revalidate = 3600;

export const metadata = {
  title: "Add Market Intelligence to Claude · Custom connector",
  description:
    "Connect Claude on claude.ai with a custom MCP connector. Requires a paid plan (Daily pass, Plus, or Pro) and one-time Allow access.",
};

export default function ConnectClaudePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <PublicHeader backHref="/" backLabel="Home" />
      <main className="mx-auto max-w-2xl flex-1 px-4 sm:px-6 py-10 sm:py-16 text-sm leading-relaxed w-full">
      <h1 className="mt-2 text-3xl font-semibold">Add Market Intelligence to Claude</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Add a custom connector with the MCP URL below, click <b>Connect</b>, then <b>Allow access</b> on our consent page.
        Sign in, subscribe to a paid plan, then add the MCP URL. Live NIFTY, macro, scanners, and research. OAuth client ID/secret stay blank.
      </p>

      <ClaudeConnectorClient url={CLAUDE_CONNECTOR.url} name={CLAUDE_CONNECTOR.name} />

      <p className="mt-8 text-muted-foreground">
        Need Cursor, terminal, or troubleshooting? See the{" "}
        <Link href="/help" className="text-blue-600 hover:underline">
          full help center
        </Link>
        .
      </p>
      <p className="mt-4">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to home
        </Link>
      </p>
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
