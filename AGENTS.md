<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Typography (required)

**Google Sans is the only allowed typeface** in this repository — UI, emails, static HTML, and agent-generated markup. Do not import `Google_Sans_Code`, use `font-mono` / `font-serif`, or set `font-family` to system fonts, Roboto, Product Sans, or monospace stacks.

- Policy: `docs/TYPOGRAPHY.md`
- Shared constant: `src/lib/typography.ts`
- Verify: `npm run check:typography` (part of `npm run lint`)

## React update loops (required)

**React error #185** (`Maximum update depth exceeded`) came from two patterns:

1. **Unstable SWR fetcher** — `const fetcher = async` inside a hook body without `useCallback`, or inline `async` passed to `useSWR`. New function identity every render → endless revalidate → `setState` in fetcher → loop. **Fix:** module-level loader (see `loadIndiaDashboard` in `src/hooks/use-india-dashboard.ts`) or `useCallback` with minimal deps.
2. **Effect-synced list selection** — `useEffect(() => { if (!list.includes(x)) setX(list[0]) })` when the list flickers. **Fix:** derive with `pickControlledString` / `pickControlledListItem` from `src/lib/react/pick-controlled-list-item.ts` inside `useMemo`, not `useEffect`.

3. **Unstable `useSyncExternalStore` snapshot** — `getSnapshot()` returning a new object/array when storage unchanged (e.g. `{ ...parsed }` every call). React treats each snapshot as changed → render loop. **Fix:** cache by localStorage raw string (see `getLocalSettings` / `getLocalHoldings` in `src/hooks/use-my-portfolio.ts`). SWR keys should use **primitives**, not settings objects.

CI: `npm run check:react-loops` (part of `npm run lint`).

## Terminal parity (required for new features)

The `mi` terminal app (`public/cli/mi.mjs`, docs at `/help#terminal`) builds its menu from the MCP `tools/list`. When you add or change a website feature that shows market, macro, research, derivatives or scanner data, add or update a matching **read-only** tool in `src/lib/mcp/tools-site.ts` (with `title` and `category`) so it appears in the terminal with no CLI change, and add it to the tool table in `src/app/help/page.tsx`. Do not expose user-specific data (portfolio, alerts, admin) through MCP. Keep tool output reasonably small (flatten or drop huge series). Only touch `mi.mjs` when a tool needs a custom renderer.
