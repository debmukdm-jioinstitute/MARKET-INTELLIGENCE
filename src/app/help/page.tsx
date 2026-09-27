import { buildHelpMcpToolRows } from "@/lib/help/mcp-tool-guide";
import { CRONS, MCP_ACCOUNT_TOOLS, PORTAL_ONLY_UI, helpSitemapSections } from "@/lib/help/site-guide";
import Link from "next/link";

export const metadata = {
  title: "Help · Site guide, MCP & terminal · Market Intelligence",
  description:
    "How the portal works, scheduled data jobs, MCP and mi terminal tools (kept in sync with tools/list), plus connect steps for Claude, Cursor and other clients.",
};

const ENDPOINT = "https://getmarketintelligence.in/api/mcp";
const TOOLS = buildHelpMcpToolRows();
const SITEMAP = helpSitemapSections();

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
      <h1 className="mb-3 text-3xl font-semibold">Help & site guide</h1>
      <p className="text-base text-muted-foreground">
        Use the signed-in portal for portfolio, alerts, and live option tools. Query the same public market data through a read-only MCP
        endpoint ({TOOLS.length} tools, synced with this page) or the <b>mi</b> terminal. Background jobs refresh scans, briefs, and
        collectors on a schedule.
      </p>

      <nav className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {[
          ["#site", "Using the website"],
          ["#operations", "Background jobs"],
          ["#account-mcp", "Account tools (MCP)"],
          ["#web-only", "Portal-only UI"],
          ["#basics", "MCP basics"],
          ["#connect", "Connect a client"],
          ["#test", "Test it"],
          ["#terminal", "Terminal app (mi)"],
          ["#tools", "All MCP tools"],
          ["#troubleshooting", "Troubleshooting"],
          ["#owners", "For the site owner"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="text-blue-600 hover:underline">
            {label}
          </a>
        ))}
      </nav>

      <section id="site" className="mt-10 rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold">Using the website</h2>
        <p className="mt-3 text-muted-foreground">
          The product lives at{" "}
          <Link href="/Home" className="text-blue-600 hover:underline">
            getmarketintelligence.in
          </Link>{" "}
          (sign in for portfolio, alerts, Upstox-backed option chain tools, and the floating site assistant). Public pages such as this
          help doc and the marketing home do not require an account.
        </p>
        <p className="mt-3 text-muted-foreground">
          Every signed-in page lists related tabs from the nav registry. The footer <b>Sitemap</b> on portal pages mirrors the same
          structure ({SITEMAP.length} sections). Highlights:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <Link href="/intelligence/brief" className="text-blue-600 hover:underline">
              Daily Brief
            </Link>{" "}
            and{" "}
            <Link href="/intelligence/ai-signals" className="text-blue-600 hover:underline">
              AI Signals
            </Link>{" "}
            (ensemble index models + options strategy lab)
          </li>
          <li>
            <Link href="/intelligence/scanner" className="text-blue-600 hover:underline">
              Stock Scanner
            </Link>{" "}
            and{" "}
            <Link href="/intelligence/backtesting" className="text-blue-600 hover:underline">
              Backtesting
            </Link>
          </li>
          <li>
            <Link href="/data/health" className="text-blue-600 hover:underline">
              Data health
            </Link>{" "}
            and{" "}
            <Link href="/data/export" className="text-blue-600 hover:underline">
              Data export
            </Link>
          </li>
        </ul>
      </section>

      <section id="operations" className="mt-10">
        <h2 className="text-lg font-semibold">Background jobs (site operations)</h2>
        <p className="mt-3 text-muted-foreground">
          Scheduled tasks hit <b>/api/cron/*</b> with <b>Authorization: Bearer CRON_SECRET</b>. Vercel Cron runs daily (and weekday)
          jobs; GitHub Actions covers high-frequency collector, stress, alerts, briefs, and betas when Hobby cron limits apply. Admins
          can fire any job from{" "}
          <Link href="/admin/system" className="text-blue-600 hover:underline">
            Admin → System &amp; Jobs
          </Link>{" "}
          or run the <b>run-all-crons</b> workflow in GitHub (manual dispatch).
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Endpoint</th>
                <th className="px-4 py-2.5 font-medium">Schedule</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {CRONS.map((c) => (
                <tr key={c.path} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{c.path}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.schedule}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.source}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Useful manual calls (owner):{" "}
          <b>/api/cron/brief?kind=pre</b> or <b>post</b>;{" "}
          <b>/api/cron/signals?indicesOnly=1</b> to refresh F&amp;O index models only;{" "}
          <b>/api/cron/collect?only=rbi,ecb&amp;dry=1</b> to validate collectors without writing.
        </p>
      </section>

      <section id="account-mcp" className="mt-10 rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold">Account tools on MCP / mi</h2>
        <p className="mt-2 text-muted-foreground">
          Portfolio, OptionStrat lab, alerts, algo desk, assistant, and admin status are available over the same MCP endpoint after
          sign-in. Public market tools still use your <b>MCP API key</b>; account tools use a <b>session token</b> from{" "}
          <b>mi_sign_in</b> (no API key required for sign-in itself).
        </p>
        <Code>{`# 1) Sign in (returns sessionToken)
curl -s ${ENDPOINT} -H 'content-type: application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"mi_sign_in","arguments":{"email":"YOU@example.com","password":"YOUR_PASSWORD"}}}'

# 2) Call an account tool
curl -s ${ENDPOINT} \\
  -H 'content-type: application/json' \\
  -H 'X-MI-Session: SESSION_TOKEN_FROM_STEP_1' \\
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_my_portfolio","arguments":{}}}'`}</Code>
        <p className="mt-3 text-muted-foreground">
          Terminal: <b>mi login EMAIL PASSWORD</b> saves the session to <b>~/.mi/config.json</b>. Then{" "}
          <b>mi get_my_portfolio</b>, <b>mi get_optionstrat_recommend index=banknifty bias=bullish</b>, etc.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {MCP_ACCOUNT_TOOLS.map((t) => (
            <li key={t.name}>
              <span className="font-semibold text-foreground">{t.name}</span> — {t.label}. {t.note}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Treat <b>sessionToken</b> like a password. Revoke by changing your account password on the site.
        </p>
      </section>

      <section id="web-only" className="mt-10 rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold">Portal-only UI</h2>
        <p className="mt-2 text-muted-foreground">
          Some flows stay in the browser (rich editors, OAuth, streaming). Data for most of these is still reachable via MCP after
          sign-in — see Account tools above.
        </p>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          {PORTAL_ONLY_UI.map((f) => (
            <li key={f.href}>
              <Link href={f.href} className="font-medium text-blue-600 hover:underline">
                {f.label}
              </Link>
              <span className="text-muted-foreground"> — {f.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="basics" className="mt-10 rounded-xl border border-border p-5">
        <h2 className="text-base font-semibold">The basics</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[9rem_1fr]">
          <dt className="text-muted-foreground">Endpoint</dt>
          <dd className="break-all font-medium">{ENDPOINT}</dd>
          <dt className="text-muted-foreground">Transport</dt>
          <dd>Streamable HTTP, JSON-RPC 2.0</dd>
          <dt className="text-muted-foreground">Auth</dt>
          <dd>
            <b>Public tools:</b> API key in <b>X-API-Key</b> or <b>Authorization: Bearer</b> (must match{" "}
            <b>MCP_API_KEYS</b>). <b>Account tools:</b> call <b>mi_sign_in</b>, then pass{" "}
            <b>X-MI-Session</b> (or Bearer session token). <b>tools/list</b> is open.
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
          curve, sector betas, scenarios and single-stock risk, plus every other market, macro, research, derivatives and
          scanner feature on the site. It talks to the same read-only endpoint, so
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
        <p className="mt-2 text-muted-foreground">
          The main screen shows your favourites as one-key shortcuts, then three doors to everything else. The full
          feature list comes from the server every time you start <b>mi</b>, so anything new added to the site&apos;s
          MCP endpoint appears in the menu on its own, with no reinstall.
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Key</th>
                <th className="px-4 py-2.5 font-medium">What it does</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["S", "Market snapshot (default, just press Enter)"],
                ["X", "India Macro Stress Index, families and top components"],
                ["B", "Daily brief with headlines and what to watch"],
                ["R", "RBI policy corridor, liquidity, FX reserves"],
                ["Y", "India T-bill and G-sec yield curve"],
                ["T", "Sector sensitivities to Brent, USD/INR, US10Y, S&P"],
                ["N", "Macro scenario: sector impact of shocks"],
                ["K", "Volatility, drawdown, beta, earnings for a symbol"],
                ["H", "Data health: how fresh each feed is"],
                ["M", "More: browse every feature by category (Markets, Macro, Research, Derivatives, Scanners, System), pick a number, answer the prompts"],
                ["F", "Find a feature by typing part of its name, for example \"option\" or \"ipo\""],
                ["A", "Text size: make the text bigger or smaller (see below)"],
                ["E", "Edit or replace your API key"],
                ["U", "Check for a newer version of mi and update"],
                ["Z", "Exit (or press Ctrl + C)"],
              ].map(([k, what]) => (
                <tr key={k} className="border-t border-border align-top">
                  <td className="px-4 py-2.5 font-semibold">{k}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-6 font-semibold">Run any feature straight from the shell</h3>
        <p className="mt-2 text-muted-foreground">
          Every feature is also a command, so you can script it or pipe it. Direct commands print once and exit.
        </p>
        <Code>{`mi tools                      # list every feature with its arguments
mi tools option               # only those matching "option"
mi snapshot                   # shortcuts: snapshot stress brief rbi yields health backtest
mi risk TCS
mi scenario brent=10 usdinr=2 us10y_bp=25 spx=-3
mi get_option_expiries underlying=NIFTY
mi get_option_chain underlying=NIFTY expiry=2026-10-06
mi get_ipos status=open
mi get_scanner scanner=high52w
mi get_stock_research symbol=RELIANCE --all
mi get_price_history symbol=TCS range=3mo --json > tcs.json`}</Code>
        <p className="text-muted-foreground">
          Arguments are <b>key=value</b>. If a feature needs one main argument you can pass it bare, as in{" "}
          <b>mi risk TCS</b>. Flags: <b>--all</b> shows every table row (default is the first 30), <b>--json</b> prints raw
          JSON. Scenario shocks are <b>brent</b>, <b>usdinr</b> and <b>spx</b> in %, and <b>us10y_bp</b> in basis points.
          Set <b>NO_COLOR=1</b> to turn colours off.
        </p>

        <h3 className="mt-6 font-semibold">Text too small?</h3>
        <p className="mt-2 text-muted-foreground">
          A program can&apos;t change your terminal&apos;s font on its own, so there are two ways. In <b>macOS
          Terminal.app</b>, <b>mi</b> raises the text to size 16 for its own window while it runs and puts it back when you
          exit. Change or disable that any time:
        </p>
        <Code>{`mi font 18        # use size 18 (9 to 40)
mi font off       # never change my text size
mi font reset     # back to the default of 16
mi font           # show the current setting`}</Code>
        <p className="text-muted-foreground">
          The <b>A</b> key in the menu does the same. In every other terminal (iTerm2, VS Code, Windows Terminal, Linux),
          zoom yourself: <b>Cmd and +</b> on macOS, or <b>Ctrl, Shift and +</b> elsewhere. The banner needs a window about
          70 columns wide, so widen the window if it wraps.
        </p>

        <h3 className="mt-6 font-semibold">Keeping mi up to date</h3>
        <p className="mt-2 text-muted-foreground">
          New site features reach your terminal automatically through the menu. The <b>mi</b> program itself is a single
          file; when a newer one is published, <b>mi</b> tells you (it checks at most once every 12 hours). Update with:
        </p>
        <Code>{`mi update`}</Code>
        <p className="text-muted-foreground">
          Older installs that don&apos;t have <b>mi update</b> yet: re-run the download command from the install step once.
        </p>

        <h3 className="mt-6 font-semibold">What the terminal does not include</h3>
        <p className="mt-2 text-muted-foreground">
          See <a href="#web-only" className="text-blue-600 hover:underline">Portal-only features</a> above — portfolio, alerts, algo
          desk, OptionStrat lab, admin, and exports. An API key identifies a client, not a person. All read-only market, macro,
          research, derivatives, and scanner data is available through MCP and <b>mi</b>.
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
        <h2 className="text-lg font-semibold">The {TOOLS.length} MCP tools</h2>
        <p className="mt-2 text-muted-foreground">
          This table is generated from the live tool registry in code — if a tool appears in <b>tools/list</b> or <b>mi tools</b>, it
          appears here on the next deploy.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Group</th>
                <th className="px-4 py-2.5 font-medium">Tool</th>
                <th className="px-4 py-2.5 font-medium">What it returns</th>
                <th className="px-4 py-2.5 font-medium">Try asking</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map((t) => (
                <tr key={t.name} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{t.group}</td>
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
