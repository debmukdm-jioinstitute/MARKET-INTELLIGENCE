"use client";

import { ClaudeMcpSetupVisual } from "@/components/help/claude-mcp-setup-visual";

export function ClaudeConnectorClient({ url, name }: { url: string; name: string }) {
  return (
    <div className="mt-8">
      <ClaudeMcpSetupVisual endpoint={url} connectorName={name} showDesktopNote />
    </div>
  );
}
