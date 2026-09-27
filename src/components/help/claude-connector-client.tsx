"use client";

import { useState } from "react";

export function ClaudeConnectorClient({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Connector URL (copy this)</p>
        <p className="mt-2 break-all text-base font-medium">{url}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600/90"
        >
          {copied ? "Copied" : "Copy URL"}
        </button>
      </div>

      <section className="rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold">Claude on the web (claude.ai)</h2>
        <p className="mt-2 text-muted-foreground">Works on Free (one connector), Pro, Max, Team, and Enterprise.</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>
            Open{" "}
            <a href="https://claude.ai" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              claude.ai
            </a>{" "}
            and sign in.
          </li>
          <li>
            Go to <b>Customize</b> → <b>Connectors</b> (Team/Enterprise owners: <b>Organization settings</b> →{" "}
            <b>Connectors</b> first).
          </li>
          <li>
            Click <b>+</b> → <b>Add custom connector</b>.
          </li>
          <li>
            Name: <b>{name}</b>. URL: paste the link above. Leave OAuth fields blank.
          </li>
          <li>
            Click <b>Add</b>. Start a new chat → <b>+</b> → <b>Connectors</b> → turn on {name}.
          </li>
          <li>Ask: &ldquo;What is the India macro stress index today?&rdquo;</li>
        </ol>
      </section>

      <section className="rounded-xl border border-border p-5">
        <h2 className="text-lg font-semibold">Claude Desktop (app on your computer)</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Same as web: try Customize → Connectors → Add custom connector with the URL above.</li>
          <li>
            If that fails, use Settings → Developer → Edit Config and the <b>mcp-remote</b> bridge (see{" "}
            <a href="/help" className="text-blue-600 hover:underline">
              help
            </a>
            ).
          </li>
        </ol>
      </section>

      <p className="text-xs text-muted-foreground">
        Claude connects from Anthropic&apos;s servers to our public MCP URL. Your portfolio still needs website sign-in
        (mi_sign_in) — not included in the default connector.
      </p>
    </div>
  );
}
