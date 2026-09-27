import { ClaudeConnectorClient } from "@/components/help/claude-connector-client";
import { CLAUDE_CONNECTOR } from "@/lib/mcp/connector-public";
import Link from "next/link";

export const metadata = {
  title: "Add Market Intelligence to Claude · Custom connector",
  description:
    "Connect Claude on claude.ai with a custom MCP connector, one-time Allow access, and live India market data. No API key.",
};

export default function ConnectClaudePage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-sm leading-relaxed">
      <p className="text-xs uppercase tracking-[0.2em] text-blue-600">Claude · Custom connector</p>
      <h1 className="mt-2 text-3xl font-semibold">Add Market Intelligence to Claude</h1>
      <p className="mt-3 text-base text-muted-foreground">
        Add a custom connector with the MCP URL below, click <b>Connect</b>, then <b>Allow access</b> on our consent page.
        Live NIFTY, macro, scanners, and research — no API key, no email to us. OAuth client ID/secret stay blank.
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
    </main>
  );
}
