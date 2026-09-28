"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { HelpToolRow } from "@/lib/help/mcp-tool-guide";
import { ClaudeMcpSetupVisual } from "@/components/help/claude-mcp-setup-visual";
import { ClaudeBrandIcon, CursorBrandIcon } from "@/components/help/mcp-brand-icons";
import { CLAUDE_CONNECTOR, MCP_ENDPOINT } from "@/lib/mcp/connector-public";
import Link from "next/link";

const ENDPOINT = MCP_ENDPOINT;

function Code({ children }: { children: string }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-muted/60 p-4 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="my-3 list-decimal space-y-2 pl-5 text-muted-foreground">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ol>
  );
}

type Props = {
  tools: HelpToolRow[];
  sitemapSectionCount: number;
  accountTools: { name: string; label: string; note: string }[];
  portalOnly: { label: string; href: string; note: string }[];
};

const TROUBLE = [
  {
    problem: "Claude: “Couldn't register with … sign-in service” (ofid_…)",
    fix: `Delete the old connector and add again with URL ${ENDPOINT}. Leave OAuth client ID/secret empty. Click Connect and complete Allow access. If it still fails, email Deb@getmarketintelligence.in with the full ofid_ code.`,
  },
  {
    problem: "Claude connected but no tools / stale answers",
    fix: "Start a new chat, open + → Connectors, and enable Market Intelligence. Ask one clear question. Disconnect and reconnect the connector if needed.",
  },
  {
    problem: "Cursor or Claude Code cannot connect",
    fix: "Confirm the MCP URL is exact (see below). Restart the app. Claude Code: run claude mcp list and check market-intelligence shows Connected.",
  },
  {
    problem: "Link redirects to login or empty response",
    fix: `Use exactly ${ENDPOINT} for MCP — not /help or an old vercel.app host.`,
  },
  {
    problem: "Too many requests / rate limit",
    fix: "Wait about a minute between bursts. Use mi login or mi_sign_in for a higher cap on personal tools.",
  },
  {
    problem: "Portfolio or options tools say sign in required",
    fix: "Claude OAuth Allow access is only for public market data. For holdings, use mi_sign_in (or mi login) with your website email and password.",
  },
];

export function HelpGuide({ tools, sitemapSectionCount, accountTools, portalOnly }: Props) {
  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-blue-600/20 bg-blue-600/5 p-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Quick paths:</span>{" "}
        <Link href="/connect/claude" className="font-semibold text-blue-600 hover:underline">
          Claude setup page
        </Link>{" "}
        · open <span className="font-semibold text-foreground">Let your AI assistant read market data</span> below · portfolio in AI needs{" "}
        <span className="font-semibold text-foreground">mi_sign_in</span>, not the Claude Allow screen.
      </p>

      <Accordion type="multiple" defaultValue={["mcp"]} className="rounded-xl border border-border px-4">
        <AccordionItem value="start">
          <AccordionTrigger className="text-base font-semibold">New here? Start here</AccordionTrigger>
          <AccordionContent className="space-y-3 text-muted-foreground">
            <p>
              <b>Market Intelligence</b> is a website for Indian markets: indices, macro, research, scanners, and AI signals.
              You can use it in the browser at{" "}
              <Link href="/Home" className="text-blue-600 hover:underline">
                getmarketintelligence.in
              </Link>
              .
            </p>
            <p>
              <b>Connect to your AI (MCP)</b> lets Cursor or Claude pull live numbers when you ask in plain English — for example
              &ldquo;What is the stress index today?&rdquo; <b>Claude on claude.ai</b> uses a custom connector plus a one-time
              Allow access step. <b>Cursor</b> only needs the MCP URL in settings.
            </p>
            <p>
              <b>mi</b> is an optional text menu in Terminal for people who like the command line. You do not need it if you
              only use the website or Cursor.
            </p>
            <p className="text-xs">Data is descriptive only — not buy/sell advice.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="worldmonitor">
          <AccordionTrigger className="text-base font-semibold">The world monitor</AccordionTrigger>
          <AccordionContent className="space-y-3 text-muted-foreground">
            <p id="worldmonitor">
              <b>Not a full clone inside one app yet.</b> We ship upstream{" "}
              <a
                href="https://github.com/koala73/worldmonitor"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                World Monitor
              </a>{" "}
              as a git submodule and embed the finance variant at{" "}
              <Link href="/intelligence/world-monitor" className="text-blue-600 hover:underline">
                /intelligence/world-monitor
              </Link>
              .
            </p>
            <Steps
              items={[
                "Sign in to Market Intelligence → Today → World Monitor (or open the path above).",
                "Click Launch World Monitor — loads /worldmonitor/dashboard proxied on our domain (upstream blocks iframes).",
                "Or open on worldmonitor.app in a new tab if the proxy is down.",
                "Self-host: submodule services/worldmonitor, deploy separately, set NEXT_PUBLIC_WORLDMONITOR_URL.",
                "India portfolio, stress index, and scanners stay in other MI menus — World Monitor is global situational awareness.",
              ]}
            />
            <p className="text-xs">AGPL-3.0 upstream — see docs/WORLDMONITOR.md in the repo for self-host notes.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="website">
          <AccordionTrigger className="text-base font-semibold">Using the site</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <Steps
              items={[
                "Go to getmarketintelligence.in and click Sign in or Create account.",
                "After login, use the top menu: Daily Brief, Markets, Research, Scanners, Portfolio, etc.",
                "Scroll to the footer on any signed-in page — the Sitemap lists every page (" +
                  sitemapSectionCount +
                  " groups).",
                "AI Signals (/intelligence/ai-signals) shows index models and an options strategy lab (NIFTY / Bank Nifty / Finnifty).",
                "Portfolio, alerts, and data export need your account — they stay private to you.",
              ]}
            />
            <p className="mt-2">
              <Link href="/signup" className="text-blue-600 hover:underline">
                Create account
              </Link>
              {" · "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mcp">
          <AccordionTrigger className="text-base font-semibold">
            Let your AI assistant read market data
          </AccordionTrigger>
          <AccordionContent>
            <p className="mb-3 text-muted-foreground">
              One MCP URL for every client. You never need to email us for an API key for public market tools.
            </p>
            <Code>{ENDPOINT}</Code>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#CC785C]/25 bg-[#CC785C]/5 p-4">
                <div className="flex items-center gap-2">
                  <ClaudeBrandIcon className="h-8 w-8" />
                  <p className="font-semibold text-foreground">Claude (claude.ai)</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Custom connector → <b>Connect</b> → <b>Allow access</b> (OAuth). OAuth client fields stay blank.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2">
                  <CursorBrandIcon className="h-8 w-8" />
                  <p className="font-semibold text-foreground">Cursor</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Paste URL in MCP settings only — no OAuth screen. Fastest for many users.
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">Claude on the web — full walkthrough</h3>
                <Link href="/connect/claude" className="text-sm font-medium text-blue-600 hover:underline">
                  Open /connect/claude →
                </Link>
              </div>
              <ClaudeMcpSetupVisual endpoint={ENDPOINT} connectorName={CLAUDE_CONNECTOR.name} />
            </div>

            <Accordion type="single" collapsible className="mt-8 border-t border-border pt-2">
              <AccordionItem value="cursor">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <CursorBrandIcon className="h-6 w-6" />
                    Cursor (recommended for many users)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <Steps
                    items={[
                      "Open Cursor → Settings (gear icon) → search for MCP or open Features → MCP.",
                      "Click Edit config or open the file ~/.cursor/mcp.json on your computer.",
                      "Paste the block below. Save the file.",
                      "Restart Cursor or start a new Agent chat.",
                      "Ask: “What’s the India macro stress index right now?” — Cursor should call the site automatically.",
                    ]}
                  />
                  <Code>{`{
  "mcpServers": {
    "market-intelligence": {
      "url": "${ENDPOINT}"
    }
  }
}`}</Code>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="claude-code">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <ClaudeBrandIcon className="h-6 w-6" />
                    Claude Code (terminal)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-2 text-sm">
                    Uses HTTP transport directly — no claude.ai OAuth screen. Same public tools as the website.
                  </p>
                  <Steps
                    items={[
                      "Open Terminal.",
                      "Run the command below (one line).",
                      "Run claude mcp list — you should see market-intelligence Connected.",
                      "Ask about NIFTY, stress index, or scanners in Claude Code.",
                    ]}
                  />
                  <Code>{`claude mcp add --scope user --transport http market-intelligence ${ENDPOINT}`}</Code>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="claude-desktop">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <ClaudeBrandIcon className="h-6 w-6" />
                    Claude Desktop (fallback)
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-2 text-sm">
                    Prefer <b>Customize → Connectors</b> on the Desktop app when available (same as claude.ai). If not, use{" "}
                    <b>mcp-remote</b> below.
                  </p>
                  <Steps
                    items={[
                      "Install Node.js from nodejs.org if needed.",
                      "Claude → Settings → Developer → Edit Config.",
                      "Paste the JSON below, save, fully quit Claude, reopen.",
                    ]}
                  />
                  <Code>{`{
  "mcpServers": {
    "market-intelligence": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${ENDPOINT}"]
    }
  }
}`}</Code>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="other-mcp">
                <AccordionTrigger className="text-sm font-semibold">Other AI apps (ChatGPT, Copilot, etc.)</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <Steps
                    items={[
                      "Pick HTTP or Streamable HTTP transport (use mcp-remote locally only if the app requires it).",
                      "Server URL: paste the MCP endpoint above.",
                      "If the app supports OAuth discovery, it may open the same Allow access flow as Claude.",
                      "If the app asks for API keys, leave them empty for public market data.",
                      "Save and start a new conversation.",
                    ]}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="mcp-test">
                <AccordionTrigger className="text-sm font-semibold">Test that it works (optional)</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-2">If you use Terminal, this should return JSON (not an error):</p>
                  <Code>{`curl -s ${ENDPOINT} \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_stress_index","arguments":{}}}'`}</Code>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="mcp-ask">
                <AccordionTrigger className="text-sm font-semibold">Example questions to try</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>What is the India Macro Stress Index and what is driving it?</li>
                    <li>Give me today’s market snapshot for India.</li>
                    <li>Which scanners flag INFY?</li>
                    <li>What are today’s AI signals for NIFTY?</li>
                    <li>If Brent rises 10%, which sectors are most exposed?</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <dl className="mt-6 grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
              <dt className="text-muted-foreground">Claude OAuth</dt>
              <dd className="text-muted-foreground">
                One-time Allow access for public data only — not your website password. Portfolio tools use mi_sign_in separately.
              </dd>
              <dt className="text-muted-foreground">Rate limit</dt>
              <dd className="text-muted-foreground">About 45 public tool calls per minute per connection.</dd>
              <dt className="text-muted-foreground">Safety</dt>
              <dd className="text-muted-foreground">Read-only market data — AI cannot place trades or change your account.</dd>
            </dl>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="account">
          <AccordionTrigger className="text-base font-semibold">
            Using your portfolio with AI
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground">
            <p className="mb-3">
              Public market data needs no API key. Claude&apos;s <b>Allow access</b> step does <b>not</b> unlock your portfolio.
              For <b>your</b> holdings, alerts, OptionStrat lab, algo desk snapshot, or site assistant via MCP, sign in with the
              same email and password as the website using <b>mi_sign_in</b> or <b>mi login</b>.
            </p>
            <p className="font-semibold text-foreground">Easiest: terminal</p>
            <Steps
              items={[
                "Install mi (see Terminal section below) or use any MCP client.",
                "Run: mi login YOUR_EMAIL YOUR_PASSWORD",
                "Then: mi get_my_portfolio or ask Cursor after configuring session (advanced).",
              ]}
            />
            <p className="mt-4 font-semibold text-foreground">What you can access after login</p>
            <ul className="mt-2 space-y-2">
              {accountTools.map((t) => (
                <li key={t.name}>
                  <span className="font-medium text-foreground">{t.label}</span> — {t.note}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs">Some things are still easier in the browser only:</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {portalOnly.map((f) => (
                <li key={f.href}>
                  <Link href={f.href} className="text-blue-600 hover:underline">
                    {f.label}
                  </Link>{" "}
                  — {f.note}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="terminal">
          <AccordionTrigger className="text-base font-semibold">The optional desktop app</AccordionTrigger>
          <AccordionContent>
            <Accordion type="single" collapsible>
              <AccordionItem value="mi-need">
                <AccordionTrigger className="text-sm font-semibold">What you need</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Node.js 18+ (check: node -v)</li>
                    <li>Mac, Linux, or Windows</li>
                    <li>No API key for market menus</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="mi-mac">
                <AccordionTrigger className="text-sm font-semibold">Install on Mac or Linux</AccordionTrigger>
                <AccordionContent>
                  <Code>{`mkdir -p ~/.local/bin
curl -fsSL https://getmarketintelligence.in/cli/mi.mjs -o ~/.local/bin/mi
chmod +x ~/.local/bin/mi
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
mi`}</Code>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="mi-win">
                <AccordionTrigger className="text-sm font-semibold">Install on Windows</AccordionTrigger>
                <AccordionContent>
                  <Code>{`mkdir $HOME\\.mi -Force
curl.exe -fsSL https://getmarketintelligence.in/cli/mi.mjs -o $HOME\\.mi\\mi.mjs
node $HOME\\.mi\\mi.mjs`}</Code>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="mi-use">
                <AccordionTrigger className="text-sm font-semibold">How to use the menu</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <p className="mb-2">Run mi and press Enter for snapshot, or use keys:</p>
                  <ul className="grid gap-1 text-sm sm:grid-cols-2">
                    {[
                      ["S / Enter", "Market snapshot"],
                      ["X", "Stress index"],
                      ["B", "Daily brief"],
                      ["M", "Browse all features"],
                      ["F", "Find by name"],
                    ].map(([k, d]) => (
                      <li key={k}>
                        <span className="font-semibold text-foreground">{k}</span> — {d}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3">
                    Portfolio: <b>mi login email password</b> then use menu or <b>mi get_my_portfolio</b>.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="trouble">
          <AccordionTrigger className="text-base font-semibold">Something went wrong</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-4">
              {TROUBLE.map((t) => (
                <li key={t.problem} className="rounded-lg border border-border p-3">
                  <p className="font-semibold text-foreground">{t.problem}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.fix}</p>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="tools">
          <AccordionTrigger className="text-base font-semibold">
            Everything your AI can look up ({tools.length} tools)
          </AccordionTrigger>
          <AccordionContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Technical names below — your AI picks these automatically; you do not need to memorize them.
            </p>
            <div className="max-h-[420px] overflow-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/90">
                  <tr>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Plain idea</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((t) => (
                    <tr key={t.name} className="border-t border-border align-top">
                      <td className="px-3 py-2 text-muted-foreground">{t.group}</td>
                      <td className="px-3 py-2 font-medium">{t.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.ask}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>

      <p className="text-muted-foreground">
        Still stuck? Email{" "}
        <a href="mailto:Deb@getmarketintelligence.in" className="text-blue-600 hover:underline">
          Deb@getmarketintelligence.in
        </a>
        .
      </p>
      <p>
        <Link href="/" className="text-blue-600 hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
