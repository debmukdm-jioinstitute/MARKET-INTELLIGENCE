#!/usr/bin/env node
/**
 * Guards against React #185 (max update depth) regressions.
 * @see src/lib/react/pick-controlled-list-item.ts
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src");

/** Known-bad sync pattern from Home explore hub incident. */
const FORBIDDEN_SNIPPETS = [
  {
    re: /!titles\.includes\(active\)\)\s*setActive\(titles\[0\]/,
    label: "effect sync of tab from titles[0] (use pickControlledString in useMemo)",
  },
  {
    re: /!expiries\.includes\(expiry\)\)[\s\S]{0,80}?setExpiry\(expiries\[0\]/,
    label: "effect sync of expiry from expiries[0] (use pickControlledString in useMemo)",
  },
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

function checkInlineHookFetcher(rel, text) {
  if (!rel.startsWith("src/hooks/")) return [];
  const hits = [];
  const parts = text.split(/export function (use[A-Za-z0-9_]+)\s*\(/);
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i];
    const body = parts[i + 1] ?? "";
    const fnBody = body.slice(0, body.indexOf("\nexport function ") === -1 ? body.length : body.indexOf("\nexport function "));
    if (/const fetcher\s*=\s*async/m.test(fnBody) && !/const fetcher\s*=\s*useCallback/m.test(fnBody)) {
      hits.push(`${rel}: ${name}() uses inline \`const fetcher = async\` — wrap in useCallback or move to module scope (unstable fetcher → SWR revalidate loop → #185)`);
    }
    if (/useSWR\s*\(/m.test(fnBody) && /useSWR\s*\([^)]*,\s*async/m.test(fnBody)) {
      hits.push(`${rel}: ${name}() passes inline async fn to useSWR — use stable fetcher`);
    }
  }
  return hits;
}

const errors = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const text = readFileSync(file, "utf8");

  for (const { re, label } of FORBIDDEN_SNIPPETS) {
    if (re.test(text)) errors.push(`${rel}: ${label}`);
  }

  errors.push(...checkInlineHookFetcher(rel, text));
}

if (errors.length) {
  console.error("check:react-loops failed:\n");
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

console.log("check:react-loops ok");
