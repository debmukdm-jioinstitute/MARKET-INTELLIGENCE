import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Guard: the app emits a true minus (U+2212), so an ASCII-only `startsWith("-")` sign test silently paints losses green. Use signTone()/signClass(). */
function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?)$/.test(n) && !p.includes("__tests__")) out.push(p);
  }
  return out;
}

describe("sign colouring guard", () => {
  it("no component tests a number's sign with an ASCII hyphen only", () => {
    const bad = walk(join(process.cwd(), "src/components"))
      .concat(walk(join(process.cwd(), "src/app")))
      .filter((f) => /\b(?:change|chg|pct|surprise|delta|return)\w*\??\.startsWith\(["']-["']\)/i.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });
});
