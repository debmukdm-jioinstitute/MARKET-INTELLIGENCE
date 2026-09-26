import Link from "next/link";

export const metadata = {
  title: "Help · Connect your AI assistant · Market Intelligence",
  description:
    "Step-by-step guide to plugging Market Intelligence into Claude Code, Claude Desktop, Cursor or any MCP client, with example questions and troubleshooting.",
};

const ENDPOINT = "https://getmarketintelligence.in/api/mcp";

const TOOLS: { name: string; returns: string; ask: string }[] = [
  {
    name: "get_market_snapshot",
    returns: "Current values: VIX, NIFTY, USD/INR, Brent, yields, flows, RBI liquidity, stress",
    ask: "Give me today's market snapshot.",
  },
  {
    name: "get_stress_index",
    returns: "India Macro Stress Index, its components, signal families and convergence state",
    ask: "What's the India Macro Stress Index and what is driving it?",
  },
  {
    name: "get_stress_backtest",
    returns: "Historical test of the stress inputs against forward NIFTY returns",
    ask: "How well has the stress index predicted forward NIFTY returns?",
  },
  {
    name: "get_rbi_rates",
    returns: "Policy corridor, system liquidity, FX reserves",
    ask: "Show the RBI policy corridor and current liquidity.",
  },
  {
    name: "get_india_yield_curve",
    returns: "RBI-published T-bill and G-sec yields, call money range",
    ask: "What does the India yield curve look like today?",
  },
  {
    name: "get_transmission_betas",
    returns: "Sector sensitivities to Brent, USD/INR, US10Y and S&P (optional sector filter)",
    ask: "Which sectors are most sensitive to Brent?",
  },
  {
    name: "run_scenario",
    returns: "Sector impact of macro shocks (brent, usdinr, us10y_bp, spx)",
    ask: "If Brent rises 10% and USD/INR rises 2%, which sectors get hurt?",
  },
  {
    name: "get_daily_brief",
    returns: "Latest stored daily brief with its fact sheet",
    ask: "Summarise the latest daily brief.",
  },
  {
    name: "get_security_risk",
    returns: "Volatility, ATR, drawdown, beta, earnings and Form 4 filings for a symbol",
    ask: "Risk profile for RELIANCE.",
  },
  {
    name: "get_data_health",
    returns: "Freshness of every collected data series",
    ask: "Is any of the data stale?",
  },
];

const TROUBLE: { problem: string; fix: string }[] = [
  {
    problem: "\"Unauthorized: valid API key required for tools/call\"",
    fix: "The X-API-Key header is missing or wrong. Re-check the key, and make sure there is no trailing space or quote around it. Listing tools works without a key; running them does not.",
  },
  {
    problem: "Tools connect but every call fails, or the request redirects (HTTP 308)",
    fix: "Use https://getmarketintelligence.in/api/mcp. The old getmarketintelligence.vercel.app address redirects, and redirects can drop the POST body and the key header.",
  },
  {
    problem: "\"Rate limit exceeded (60 calls/minute)\"",
    fix: "Each key allows 60 tool calls per minute. Wait a minute and retry, and ask for one broad tool (such as the snapshot) instead of many small ones.",
  },
  {
    problem: "The assistant does not see the tools",
    fix: "Restart the client or start a new session after adding the server. In Claude Code, run claude mcp list and look for a Connected status.",
  },
  {
    problem: "\"Unknown tool\" or \"Method not found\"",
    fix: "Tool names are case-sensitive and use underscores, for example get_stress_index. Call tools/list to see the current names.",
  },
  {
    problem: "I don't have a key",
    fix: "Keys are issued by the site owner. Email Deb@getmarketintelligence.in to request one.",
  },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-lg border border-border bg-muted/60 p-4 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-3 text-lg font-semibold">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          {n}
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-sm leading-relaxed text-foreground">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-blue-600">Market Intelligence · Help</p>
      <h1 className="mb-3 text-3xl font-semibold">Plug us into your AI assistant</h1>
      <p className="text-base text-muted-foreground">
        Market Intelligence exposes a read-only MCP endpoint with 10 tools over the same analytics you see on the site.
        Connect it once, then ask your own assistant about the numbers in plain English.
      </p>

      <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {[
          ["#basics", "The basics"],
          ["#connect", "Connect a client"],
          ["#test", "Test it"],
          ["#terminal", "Terminal app (mi)"],
          ["#tools", "The 10 tools"],
          ["#troubleshooting", "Troubleshooting"],
          ["#owners", "For the site owner"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="text-blue-600 hover:underline">
            {label}
          </a>
        ))}
      </nav>

      <section id="basics" className="mt-10 rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold">The basics</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[9rem_1fr]">
          <dt className="text-muted-foreground">Endpoint</dt>
          <dd className="break-all font-medium">{ENDPOINT}</dd>
          <dt className="text-muted-foreground">Transport</dt>
          <dd>Streamable HTTP, JSON-RPC 2.0</dd>
          <dt className="text-muted-foreground">Auth</dt>
          <dd>
            API key in the <b>X-API-Key</b> header (or <b>Authorization: Bearer</b>). Listing tools is open; running
            them needs a key.
          </dd>
          <dt className="text-muted-foreground">Rate limit</dt>
          <dd>60 tool calls per minute per key</dd>
          <dt className="text-muted-foreground">Access</dt>
          <dd>Read-only. Nothing you ask can change data on the site.</dd>
        </dl>
      </section>

      <Step n={1} title="Get an API key">
        <p>
          Keys are issued by the site owner. Email{" "}
          <a href="mailto:Deb@getmarketintelligence.in" className="text-blue-600 hover:underline">
            Deb@getmarketintelligence.in
          </a>{" "}
          to request one. Treat it like a password: don&apos;t paste it into chats, screenshots or public repos.
        </p>
        <p>
          In the steps below, replace <b>YOUR_KEY</b> with your key.
        </p>
      </Step>

      <Step n={2} title="Connect your assistant">
        <div id="connect" />
        <h3 className="font-semibold text-foreground">Claude Code (terminal)</h3>
        <Code>{`claude mcp add --scope user --transport http market-intelligence ${ENDPOINT} \\
  --header "X-API-Key: YOUR_KEY"`}</Code>
        <p>
          <b>--scope user</b> makes it available in every project. Drop it to connect for the current project only.
          Confirm with:
        </p>
        <Code>{`claude mcp list`}</Code>
        <p>
          You should see <b>market-intelligence … Connected</b>. Restart Claude Code (or open a new session) so the
          tools load.
        </p>

        <h3 className="pt-3 font-semibold text-foreground">Cursor and other clients with HTTP MCP support</h3>
        <p>Add this to your MCP settings file (for Cursor, <b>~/.cursor/mcp.json</b>):</p>
        <Code>{`{
  "mcpServers": {
    "market-intelligence": {
      "url": "${ENDPOINT}",
      "headers": { "X-API-Key": "YOUR_KEY" }
    }
  }
}`}</Code>

        <h3 className="pt-3 font-semibold text-foreground">Claude Desktop</h3>
        <p>
          Claude Desktop connects to remote servers through a small bridge. Open <b>Settings → Developer → Edit
          Config</b> and add (needs Node.js installed):
        </p>
        <Code>{`{
  "mcpServers": {
    "market-intelligence": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "${ENDPOINT}",
        "--header", "X-API-Key:YOUR_KEY"
      ]
    }
  }
}`}</Code>
        <p>Save, then fully quit and reopen Claude Desktop.</p>

        <h3 className="pt-3 font-semibold text-foreground">Any other MCP client</h3>
        <p>
          Choose the <b>HTTP</b> (Streamable HTTP) server type, set the URL to the endpoint above, and add the header{" "}
          <b>X-API-Key</b> with your key.
        </p>
      </Step>

      <Step n={3} title="Test it">
        <div id="test" />
        <p>From a terminal, call a tool directly. A JSON reply means your key and the endpoint both work:</p>
        <Code>{`curl -s ${ENDPOINT} \\
  -H 'content-type: application/json' \\
  -H 'X-API-Key: YOUR_KEY' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_stress_index","arguments":{}}}'`}</Code>
        <p>To list the tools without a key:</p>
        <Code>{`curl -s ${ENDPOINT} \\
  -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}</Code>
      </Step>

      <Step n={4} title="Ask questions">
        <p>
          Once connected, just ask. Your assistant picks the right tool. Try{" "}
          <i>&ldquo;What&apos;s the India Macro Stress Index right now and what is driving it?&rdquo;</i> or{" "}
          <i>&ldquo;If Brent rises 10%, which sectors are most exposed?&rdquo;</i>
        </p>
      </Step>

      <section id="terminal" className="mt-12">
        <h2 className="text-lg font-semibold">Terminal app: the &ldquo;mi&rdquo; command</h2>
        <p className="mt-3 text-muted-foreground">
          Prefer a terminal? <b>mi</b> is a menu-driven screen with an ASCII banner, a live market status bar
          (NIFTY, VIX, USD/INR, Brent, stress) and one-key access to the stress index, daily brief, RBI rates, yield
          curve, sector betas, scenarios, single-stock risk and data health. It talks to the same read-only endpoint, so
          it uses the same API key and the same 60 calls/minute limit.
        </p>

        <h3 className="mt-6 font-semibold">What you need</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <b>Node.js 18 or newer</b>. Check with <b>node -v</b>. Install from nodejs.org if it is missing.
          </li>
          <li>An API key (see step 1 above).</li>
          <li>macOS, Linux, or Windows (use WSL or PowerShell). No other packages are installed.</li>
        </ul>

        <h3 className="mt-6 font-semibold">Install on macOS or Linux</h3>
        <Code>{`mkdir -p ~/.local/bin
curl -fsSL https://getmarketintelligence.in/cli/mi.mjs -o ~/.local/bin/mi
chmod +x ~/.local/bin/mi`}</Code>
        <p className="text-muted-foreground">
          If <b>mi</b> is not found afterwards, add <b>~/.local/bin</b> to your PATH (zsh shown; use ~/.bashrc for
          bash):
        </p>
        <Code>{`echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc`}</Code>

        <h3 className="mt-6 font-semibold">Install on Windows (PowerShell)</h3>
        <Code>{`mkdir $HOME\\.mi -Force
curl.exe -fsSL https://getmarketintelligence.in/cli/mi.mjs -o $HOME\\.mi\\mi.mjs
node $HOME\\.mi\\mi.mjs`}</Code>

        <h3 className="mt-6 font-semibold">First run and your API key</h3>
        <p className="text-muted-foreground">
          Run <b>mi</b>. On first launch it asks for your key and saves it to <b>~/.mi/config.json</b> (readable only
          by you). Or skip the prompt and use an environment variable:
        </p>
        <Code>{`export MI_API_KEY="YOUR_KEY"     # add to ~/.zshrc to keep it
mi`}</Code>
        <p className="text-muted-foreground">
          Change the saved key any time from the menu (<b>E</b>) or by deleting <b>~/.mi/config.json</b>.
        </p>

        <h3 className="mt-6 font-semibold">The menu</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Key</th>
                <th className="px-4 py-2.5 font-medium">Screen</th>
                <th className="px-4 py-2.5 font-medium">Direct command</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["S", "Market snapshot (default, press Enter)", "mi snapshot"],
                ["X", "India Macro Stress Index, families and top components", "mi stress"],
                ["B", "Daily brief with headlines and what to watch", "mi brief"],
                ["R", "RBI policy corridor, liquidity, FX reserves", "mi rbi"],
                ["Y", "India T-bill and G-sec yield curve", "mi yields"],
                ["T", "Sector sensitivities to Brent, USD/INR, US10Y, S&P", "mi betas [sector]"],
                ["N", "Macro scenario: sector impact of shocks", "mi scenario brent=10 usdinr=2"],
                ["K", "Volatility, drawdown, beta, earnings for a symbol", "mi risk TCS"],
                ["H", "Data health: how fresh each feed is", "mi health"],
                ["A", "Backtest of the stress index", "mi backtest"],
                ["E", "Edit or replace your API key", "n/a"],
                ["Z", "Exit (or press Ctrl + C)", "n/a"],
              ].map(([k, screen, cmd]) => (
                <tr key={k} className="border-t border-border align-top">
                  <td className="px-4 py-2.5 font-semibold">{k}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{screen}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{cmd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-muted-foreground">
          Scenario shocks are <b>brent</b> and <b>usdinr</b> and <b>spx</b> in % and <b>us10y_bp</b> in basis points,
          for example <b>mi scenario brent=10 usdinr=2 us10y_bp=25 spx=-3</b>. Direct commands print once and exit, so
          they work in scripts and cron jobs. Set <b>NO_COLOR=1</b> to turn colours off.
        </p>

        <h3 className="mt-6 font-semibold">Update or remove</h3>
        <p className="text-muted-foreground">Update by re-running the download command. To remove:</p>
        <Code>{`rm ~/.local/bin/mi && rm -rf ~/.mi`}</Code>

        <h3 className="mt-6 font-semibold">Terminal troubleshooting</h3>
        <ul className="mt-2 space-y-2 text-muted-foreground">
          <li>
            <b>command not found: mi</b>: the PATH step was skipped. Run it with <b>~/.local/bin/mi</b> or fix your PATH.
          </li>
          <li>
            <b>SyntaxError or fetch is not defined</b>: Node is older than 18. Upgrade and retry.
          </li>
          <li>
            <b>Unauthorized</b>: wrong or missing key. Press <b>E</b> in the menu or set <b>MI_API_KEY</b> again.
          </li>
          <li>
            <b>Endpoint redirected</b>: the default is https://getmarketintelligence.in/api/mcp. Only set{" "}
            <b>MI_ENDPOINT</b> if you were given a different address.
          </li>
          <li>
            <b>Garbled boxes or symbols</b>: use a UTF-8 terminal (macOS Terminal, iTerm2, Windows Terminal).
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Descriptive statistics only, not investment advice. The script is a single readable file at{" "}
          <a href="/cli/mi.mjs" className="text-blue-600 hover:underline">
            /cli/mi.mjs
          </a>
          ; read it before you run it.
        </p>
      </section>

      <section id="tools" className="mt-12">
        <h2 className="text-lg font-semibold">The 10 tools</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Tool</th>
                <th className="px-4 py-2.5 font-medium">What it returns</th>
                <th className="px-4 py-2.5 font-medium">Try asking</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map((t) => (
                <tr key={t.name} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.returns}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.ask}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Outputs are heuristic or descriptive statistics, not investment advice.
        </p>
      </section>

      <section id="troubleshooting" className="mt-12">
        <h2 className="text-lg font-semibold">Troubleshooting</h2>
        <ul className="mt-4 space-y-4">
          {TROUBLE.map((t) => (
            <li key={t.problem} className="rounded-xl border border-border p-4">
              <p className="font-semibold">{t.problem}</p>
              <p className="mt-1 text-muted-foreground">{t.fix}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="owners" className="mt-12">
        <h2 className="text-lg font-semibold">For the site owner: issuing keys</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>
            Generate a key: <b>openssl rand -hex 24</b>
          </li>
          <li>
            In Vercel, open <b>Project → Settings → Environment Variables</b> and add <b>MCP_API_KEYS</b> (type Secret,
            Production). Use a comma-separated list to issue one key per person, for example <b>key-a,key-b</b>.
          </li>
          <li>Redeploy. New variables only apply to new deployments.</li>
          <li>To revoke someone, remove their key from the list and redeploy.</li>
        </ol>
        <p className="mt-3 text-muted-foreground">
          With no keys set, tool calls are disabled and only tool listing works.
        </p>
      </section>

      <p className="mt-12 text-muted-foreground">
        Still stuck? Email{" "}
        <a href="mailto:Deb@getmarketintelligence.in" className="text-blue-600 hover:underline">
          Deb@getmarketintelligence.in
        </a>
        .
      </p>
      <p className="mt-6">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
