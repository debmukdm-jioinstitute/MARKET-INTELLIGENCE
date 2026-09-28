# World Monitor integration

## Status

| Layer | State |
| ----- | ----- |
| Full in-repo clone of UI/logic | **Submodule** at `services/worldmonitor` (upstream [koala73/worldmonitor](https://github.com/koala73/worldmonitor)) |
| Embedded in Market Intelligence | **`/intelligence/world-monitor`** — native panels from **free RSS + Yahoo + FRED CSV**; optional link to full map on worldmonitor.app |
| Feature parity with worldmonitor.app | **Not merged into Next.js** — run upstream app separately for 100% panels/maps/desktop |

Market Intelligence remains India-first; World Monitor adds global situational awareness (news, maps, CII, finance variant).

## License (AGPL-3.0)

Upstream is **AGPL-3.0-only**. Embedding their public site in an iframe does not copyleft Market Intelligence. **Self-hosting** the submodule build requires AGPL compliance (source offer, etc.). Do not copy World Monitor source into proprietary bundles without legal review.

## Self-host (recommended for production embed)

```bash
cd services/worldmonitor
npm install
npm run dev:finance   # finance variant — port from DEV_PORT in .env.local (default 3000)
```

Deploy `services/worldmonitor` to its own host (Vercel project, Docker, etc.). Set in Market Intelligence:

```bash
# Server rewrite target (default https://www.worldmonitor.app)
WORLDMONITOR_UPSTREAM_ORIGIN=https://www.worldmonitor.app
# Optional iframe launch override (default baked in: proxied global dashboard + layer query)
NEXT_PUBLIC_WORLDMONITOR_URL=/worldmonitor/dashboard?lat=0.0000&lon=0.0000&zoom=1.00&view=global&timeRange=7d&layers=conflicts,bases,hotspots,sanctions,weather,outages,protests,military,natural,ucdpEvents,ciiChoropleth
```

Redeploy MI. By default, **`/worldmonitor/dashboard`** is reverse-proxied so the dashboard runs on the Market Intelligence origin (upstream `frame-ancestors` blocks cross-site iframes). World Monitor’s **`/api/*`** calls go through a **server-side** proxy (`/api/wm-upstream/*`) so upstream does not reject the browser’s `Origin`; static map geo files (`/data/countries-110m.json`, etc.) rewrite to upstream. MI-owned paths (e.g. `/api/scenario` without `/v1`, `/data/feeds`) stay local.

## Submodule updates

```bash
git submodule update --remote services/worldmonitor
```

## What is not integrated yet

- Single sign-on with MI accounts
- Shared MCP tools for every World Monitor panel
- Tauri desktop binary inside MI
- Replacing iframe with native React port (large project)

Track follow-ups in product backlog if you need full merge into one deployment.
