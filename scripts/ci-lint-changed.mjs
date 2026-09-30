#!/usr/bin/env node
/**
 * CI helper: run ESLint only on changed TS/TSX files.
 *
 * Why not the whole repo? The tree carries 117 pre-existing ESLint errors in
 * files this project didn't touch; failing CI on those would block every PR
 * for unrelated reasons. Changed-file scoping keeps the gate honest: new or
 * modified code must be lint-clean, and `npx eslint` remains available locally
 * for the full picture (the pre-existing backlog is tracked separately).
 *
 * Usage: node scripts/ci-lint-changed.mjs <base-ref> <head-ref>
 * Exits 0 when there is nothing to lint, 1 when ESLint reports errors.
 */
import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";

/** Pure: keep only existing TypeScript sources from a changed-path list. */
export function selectLintTargets(changedPaths, exists = existsSync) {
  const seen = new Set();
  const out = [];
  for (const raw of changedPaths) {
    const p = raw.trim();
    if (!p || seen.has(p)) continue;
    seen.add(p);
    if ((p.endsWith(".ts") || p.endsWith(".tsx")) && exists(p)) out.push(p);
  }
  return out;
}

function main() {
  const [base, head] = process.argv.slice(2);
  if (!base || !head) {
    console.error("usage: node scripts/ci-lint-changed.mjs <base-ref> <head-ref>");
    process.exit(2);
  }
  let diff = "";
  try {
    diff = execSync(`git diff --name-only ${base}...${head}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    // Fall back to a two-dot diff (e.g. push events where base isn't an ancestor).
    diff = execSync(`git diff --name-only ${base} ${head}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  }
  const targets = selectLintTargets(diff.split("\n"));
  if (!targets.length) {
    console.log("ci-lint-changed: no changed TS/TSX files — skipping ESLint.");
    return;
  }
  console.log(`ci-lint-changed: linting ${targets.length} changed file(s).`);
  execFileSync("npx", ["eslint", "--no-warn-ignored", ...targets], { stdio: "inherit" });
}

if (import.meta.url === `file://${process.argv[1]}`) main();
