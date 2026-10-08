#!/usr/bin/env node
/**
 * Unzips the committed nifty500-logos*.zip archives into public/logos/ (gitignored) and writes
 * src/lib/company-logo-manifest.json (committed) = the set of symbols that have a logo file.
 * Runs on prebuild/predev. Static files only: no DB, no image optimizer, no third-party hotlinks.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "logos");
const zips = readdirSync(root).filter((f) => /^nifty500-logos.*\.zip$/.test(f)).sort();
if (!zips.length) {
  console.warn("[extract-logos] no nifty500-logos*.zip found — skipping (letter fallbacks will be used)");
  process.exit(0);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const symbols = new Set();
for (const zip of zips) {
  const files = unzipSync(new Uint8Array(readFileSync(join(root, zip))));
  for (const [name, data] of Object.entries(files)) {
    const base = name.split("/").pop();
    if (!base || !base.toLowerCase().endsWith(".png") || base.startsWith(".") || name.startsWith("__MACOSX")) continue;
    writeFileSync(join(out, base), data);
    symbols.add(base.slice(0, -4));
  }
}

const manifest = { available: [...symbols].sort() };
writeFileSync(join(root, "src", "lib", "company-logo-manifest.json"), JSON.stringify(manifest) + "\n");
console.log(`[extract-logos] ${symbols.size} logos from ${zips.length} archive(s) -> public/logos`);
