"use client";

import { useState } from "react";
import {
  ClaudeBrandIcon,
  MarketIntelligenceBrandMark,
  McpLinkIcon,
} from "@/components/help/mcp-brand-icons";

type Step = {
  title: string;
  body: string;
  hint?: string;
};

const STEPS: Step[] = [
  {
    title: "Open Claude on the web",
    body: "Go to claude.ai and sign in with your Anthropic account (Free, Pro, Max, Team, or Enterprise).",
    hint: "claude.ai",
  },
  {
    title: "Open Connectors settings",
    body: "Click your profile or sidebar → Customize → Connectors. On Team/Enterprise, an owner may need Organization settings → Connectors first.",
    hint: "Customize → Connectors",
  },
  {
    title: "Add a custom connector",
    body: "Click the + button, then choose Add custom connector (not a built-in integration).",
    hint: "+ → Add custom connector",
  },
  {
    title: "Paste name and MCP URL",
    body: "Use the connector name and URL below. Leave OAuth client ID and secret blank — Claude registers automatically. Click Connect and approve the one-time consent screen.",
    hint: "Then Connect",
  },
  {
    title: "Turn it on in a new chat",
    body: "Start a fresh conversation → click + in the message box → Connectors → enable Market Intelligence for that chat.",
    hint: "+ → Connectors → ON",
  },
  {
    title: "Ask a live market question",
    body: "Try: “What is the India macro stress index today?” Claude should call our tools and return real numbers from getmarketintelligence.in.",
    hint: "Example prompt",
  },
];

type Props = {
  endpoint: string;
  connectorName: string;
  showDesktopNote?: boolean;
};

export function ClaudeMcpSetupVisual({ endpoint, connectorName, showDesktopNote = true }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#CC785C]/30 bg-gradient-to-br from-[#CC785C]/10 via-background to-blue-600/5 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#CC785C]">Claude custom connector · MCP</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-5">
          <div className="flex flex-col items-center gap-1.5">
            <ClaudeBrandIcon />
            <span className="text-xs font-medium text-foreground">Claude</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="hidden text-lg sm:inline" aria-hidden>
              ↔
            </span>
            <McpLinkIcon className="h-9 w-9" />
            <span className="hidden text-lg sm:inline" aria-hidden>
              ↔
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <MarketIntelligenceBrandMark className="h-10 w-auto" />
            <span className="text-xs font-medium text-foreground">Market Intelligence</span>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Claude talks to our MCP server over HTTPS — live NIFTY, macro, scanners, and research. No API key.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/30 p-4 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 4 — copy these</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-[7rem_1fr]">
            <dt className="text-sm text-muted-foreground">Name</dt>
            <dd className="text-sm font-semibold text-foreground">{connectorName}</dd>
            <dt className="text-sm text-muted-foreground">MCP URL</dt>
            <dd className="break-all text-sm font-medium">{endpoint}</dd>
          </dl>
          <button
            type="button"
            onClick={() => void copyUrl()}
            className="mt-3 rounded-lg bg-[#CC785C] px-4 py-2 text-sm font-medium text-white hover:bg-[#CC785C]/90"
          >
            {copied ? "URL copied" : "Copy MCP URL"}
          </button>
        </div>
      </div>

      <ol className="space-y-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-muted/20"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CC785C]/15 text-sm font-bold text-[#CC785C]"
              aria-hidden
            >
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                {step.hint ? (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {step.hint}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
            {i === 0 ? <ClaudeBrandIcon className="hidden h-9 w-9 shrink-0 opacity-80 sm:block" /> : null}
            {i === 5 ? <MarketIntelligenceBrandMark className="hidden h-8 w-auto shrink-0 sm:block" /> : null}
          </li>
        ))}
      </ol>

      {showDesktopNote ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Claude Desktop app</p>
          <p className="mt-1">
            Try the same <b>Customize → Connectors</b> flow first. If the app does not offer custom connectors, use{" "}
            <b>Settings → Developer → Edit Config</b> with the <b>mcp-remote</b> bridge — see the Claude Desktop section in
            this help page.
          </p>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Free plan: one custom connector slot. Portfolio and personal tools still need website sign-in via{" "}
        <span className="font-medium text-foreground">mi_sign_in</span> in MCP.
      </p>
    </div>
  );
}
