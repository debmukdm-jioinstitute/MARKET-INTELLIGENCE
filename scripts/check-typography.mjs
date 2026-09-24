#!/usr/bin/env node
/**
 * Fails if the repo introduces non–Google Sans typography.
 * @see docs/TYPOGRAPHY.md
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const SCAN_DIRS = ["src", "public"];
const EXT = /\.(tsx?|jsx?|css|html|mdc|md)$/i;

const FORBIDDEN_ALWAYS = [
  { re: /Google_Sans_Code/g, label: "Google_Sans_Code import" },
  { re: /Google Sans Code/gi, label: "Google Sans Code" },
  { re: /font-family:\s*system-ui/gi, label: "system-ui font stack" },
  { re: /font-family:\s*[^;]*\bRoboto\b/gi, label: "Roboto in font-family" },
  { re: /font-family:\s*[^;]*Product Sans/gi, label: "Product Sans in font-family" },
  { re: /font-family:\s*[^;]*ui-monospace/gi, label: "ui-monospace" },
  { re: /font-family:\s*[^;]*\bmonospace\b/gi, label: "monospace stack" },
];

const FORBIDDEN_CODE = [
  { re: /\bfont-serif\b/g, label: "Tailwind font-serif" },
  { re: /\bfont-mono\b/g, label: "Tailwind font-mono" },
];

function rulesForFile(rel) {
  const isPolicyDoc = rel.endsWith(".mdc");
  return isPolicyDoc ? FORBIDDEN_ALWAYS : [...FORBIDDEN_ALWAYS, ...FORBIDDEN_CODE];
}

/** Allow bare sans-serif only in documented policy examples. */
function isAllowedSansSerifOnly(line, file) {
  if (!/font-family:\s*sans-serif/i.test(line)) return false;
  if (file.endsWith("docs/TYPOGRAPHY.md")) return true;
  if (file.includes("typography.ts") && line.includes("GOOGLE_SANS")) return true;
  return false;
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === "node_modules" || name === ".next") continue;
    const st = statSync(path);
    if (st.isDirectory()) walk(path, files);
    else if (EXT.test(name)) files.push(path);
  }
  return files;
}

const violations = [];

for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir);
  try {
    statSync(abs);
  } catch {
    continue;
  }
  for (const file of walk(abs)) {
    const rel = relative(ROOT, file);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/font-family:\s*sans-serif/i.test(line) && isAllowedSansSerifOnly(line, rel)) return;
      if (/--font-(mono|serif):/.test(line)) return;
      for (const { re, label } of rulesForFile(rel)) {
        re.lastIndex = 0;
        if (re.test(line)) {
          violations.push(`${rel}:${i + 1}: ${label} → ${line.trim().slice(0, 120)}`);
        }
      }
    });
  }
}

if (violations.length) {
  console.error("Typography check failed (Google Sans only — see docs/TYPOGRAPHY.md):\n");
  violations.forEach((v) => console.error(`  ${v}`));
  process.exit(1);
}

console.log("Typography check passed (Google Sans policy).");
