# Typography — Google Sans only

**Policy:** The entire product uses **Google Sans** as the only typeface. No Google Sans Code, system UI fonts, serif stacks, or generic `monospace` / `sans-serif` alone as the primary face.

## Implementation

| Layer | Location |
| --- | --- |
| Web app (Next.js) | `Google_Sans` from `next/font/google` in `src/app/layout.tsx` → CSS variable `--font-sans` on `<html>` |
| Global CSS | `src/app/globals.css` — `html` / `body` use `font-sans`; `--font-mono` and `--font-serif` map to `--font-sans` so legacy utilities cannot load another face |
| Emails & static HTML | `GOOGLE_SANS_FONT_STACK` in `src/lib/typography.ts` |
| Agent / contributor rules | `AGENTS.md`, `.cursor/rules/google-sans-typography.mdc` |

## Do

- Use `font-sans` (default on `body`) or inherit.
- Use `tabular-nums` for aligned figures instead of `font-mono`.
- Use `GOOGLE_SANS_FONT_STACK` in inline HTML (newsletters, unsubscribe pages).

## Do not

- Import `Google_Sans_Code` or reference **Google Sans Code**.
- Add `font-mono`, `font-serif`, `font-family: system-ui`, or stacks that include Roboto / Product Sans as primary UI fonts.
- Introduce new `next/font` families other than `Google_Sans`.

## Verification

```bash
npm run check:typography
```

Runs on every `npm run lint`.
