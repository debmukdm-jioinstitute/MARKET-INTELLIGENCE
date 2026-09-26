# Market Intelligence MCP server

Read-only access to the site's own computed data for Claude and other MCP clients.

- **Endpoint:** `POST https://getmarketintelligence.in/api/mcp` (Streamable HTTP, JSON-RPC 2.0)
- **Auth:** `initialize` and `tools/list` are open. `tools/call` needs a key in `X-API-Key` (or `Authorization: Bearer`).
  Keys are set in the `MCP_API_KEYS` environment variable (comma-separated). With none set, tool calls are disabled.
- **Rate limit:** 60 tool calls per minute per key (best effort, per serverless instance).

## Tools (all read-only)

| Tool | Returns |
|---|---|
| `get_market_snapshot` | Current metric values (VIX, NIFTY, USD/INR, Brent, yields, flows, RBI liquidity, stress) |
| `get_stress_index` | India Macro Stress Index, components, signal families, convergence state |
| `get_stress_backtest` | Historical test of the stress inputs vs forward NIFTY returns |
| `get_rbi_rates` | Policy corridor, system liquidity, FX reserves |
| `get_india_yield_curve` | RBI-published T-bill and G-sec yields, call money range |
| `get_transmission_betas` | Sector sensitivities to Brent, USD/INR, US10Y, S&P (optional `sector`) |
| `run_scenario` | Sector impact of macro shocks (`brent`, `usdinr`, `us10y_bp`, `spx`) |
| `get_daily_brief` | Latest stored daily brief with its fact sheet |
| `get_security_risk` | Vol, ATR, drawdown, beta, earnings, Form 4 filings for a `symbol` |
| `get_data_health` | Freshness of every collected series |

Outputs are heuristic or descriptive statistics, not investment advice.

## Connect from Claude Code

```bash
claude mcp add --transport http market-intelligence https://getmarketintelligence.in/api/mcp --header "X-API-Key: <your key>"
```

## Try it

```bash
curl -s https://getmarketintelligence.in/api/mcp -H 'content-type: application/json' \
  -H 'X-API-Key: <your key>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_stress_index","arguments":{}}}'
```

## Terminal app (`mi`)

A menu-driven terminal screen over the same endpoint (banner, live status bar, stress index, brief, RBI, yields, betas, scenarios, security risk, data health). Needs Node 18+.

```bash
mkdir -p ~/.local/bin
curl -fsSL https://getmarketintelligence.in/cli/mi.mjs -o ~/.local/bin/mi && chmod +x ~/.local/bin/mi
mi                      # interactive; first run asks for the API key (saved to ~/.mi/config.json)
mi stress               # one-shot commands: snapshot|stress|brief|rbi|yields|health|backtest|betas [sector]|risk SYM|scenario k=v...
```

Source: `public/cli/mi.mjs`. Full guide: `/help#terminal`.
