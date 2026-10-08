import { describe, expect, it } from "vitest";
import { NAV_SECTIONS } from "@/lib/nav-columns";
import { LEARN_MODULES, allToolHrefs, resolveKey, legacyRedirect } from "../curriculum";

const norm = (h: string) => h.split("?")[0]!.replace(/\/$/, "");

describe("learn curriculum", () => {
  it("has unique module and chapter slugs", () => {
    const mods = LEARN_MODULES.map((m) => m.slug);
    expect(new Set(mods).size).toBe(mods.length);
    for (const m of LEARN_MODULES) {
      const cs = m.chapters.map((c) => c.slug);
      expect(new Set(cs).size, m.slug).toBe(cs.length);
    }
  });

  it("resolves every related key", () => {
    for (const m of LEARN_MODULES)
      for (const c of m.chapters)
        for (const k of c.related ?? []) expect(resolveKey(k), `${m.slug}/${c.slug} -> ${k}`).toBeDefined();
  });

  it("every chapter has content, takeaways and a live tool", () => {
    for (const m of LEARN_MODULES)
      for (const c of m.chapters) {
        expect(c.sections.length, c.slug).toBeGreaterThan(0);
        expect(c.takeaways.length, c.slug).toBeGreaterThan(0);
        expect(c.tools.length, c.slug).toBeGreaterThan(0);
        for (const t of c.tools) expect(t.href.startsWith("/"), t.href).toBe(true);
      }
  });

  it("keeps old flat article URLs alive", () => {
    for (const s of [
      "what-is-ipo-gmp", "how-to-read-a-candlestick-chart", "nifty-pe-ratio-explained", "fii-dii-data-explained",
      "how-stock-screeners-work", "roe-vs-roce-indian-stocks", "ipo-price-band-explained", "market-cap-large-mid-small",
      "what-is-a-circuit-limit", "portfolio-diversification-basics",
    ])
      expect(legacyRedirect(s), s).toBeDefined();
  });

  it("covers every page in the site navigation", () => {
    const covered = new Set(allToolHrefs().map(norm));
    // Private account pages are covered by their parent chapter's cards; the rest must be linked explicitly.
    const missing = NAV_SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.items))
      .filter((i) => !i.external)
      .map((i) => norm(i.href))
      .filter((h) => !covered.has(h));
    expect(missing).toEqual([]);
  });
});
