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
