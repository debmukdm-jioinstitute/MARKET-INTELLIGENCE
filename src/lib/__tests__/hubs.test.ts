import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import { ALL_NAV_SECTIONS, NAV_SECTIONS } from "@/lib/nav-columns";
import { HUBS, HUB_ROUTES, hubAnchors, type HubKey } from "@/lib/hubs";

const byRoute = Object.fromEntries((Object.keys(HUBS) as HubKey[]).map((k) => [HUBS[k].route, k]));
const anchorOk = (href: string) => {
  const [path, qs] = href.split("?");
  const key = byRoute[path!];
  if (!key) return true; // deep tool route
  const id = new URLSearchParams(qs ?? "").get("section");
  return !id || hubAnchors(key).includes(id);
};

describe("sitemap hubs", () => {
  it("primary nav has exactly the seven hubs; Data is utility only", () => {
    expect(NAV_SECTIONS.map((s) => s.title)).toEqual(["Today", "Markets", "Economy", "Funds & Flows", "Companies", "Trade", "Portfolio"]);
    expect(ALL_NAV_SECTIONS.at(-1)!.title).toBe("Data");
  });

  it("every nav link points at a real hub anchor and hrefs are unique", () => {
    const hrefs = ALL_NAV_SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.items.map((i) => i.href)));
    expect(hrefs.filter((h) => !anchorOk(h))).toEqual([]);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("every hub section has a nav link (nothing orphaned)", () => {
    const hrefs = new Set(ALL_NAV_SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.items.map((i) => i.href))));
    const orphans: string[] = [];
    for (const k of Object.keys(HUBS) as HubKey[]) {
      for (const s of HUBS[k].sections) {
        if (["hero", "pulse", "start-here", "flows-teaser", "leverage", "ai-desk", "scanner", "lab", "options-flow"] /* teasers / page furniture */.includes(s.id)) continue;
        const subs = ("subs" in s ? s.subs : []) as readonly string[];
        const hit = [s.id, ...subs].some((a) => hrefs.has(`${HUBS[k].route}?section=${a}`));
        if (!hit) orphans.push(`${k}:${s.id}`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it("redirects target valid hub anchors, never a hub route, and do not chain", async () => {
    const rules = (await nextConfig.redirects!()) as { source: string; destination: string }[];
    const bad: string[] = [];
    const sources = new Set(rules.filter((r) => !r.source.includes(":")).map((r) => r.source));
    for (const r of rules) {
      if (r.source.includes(":") || r.destination.startsWith("http")) continue;
      if (HUB_ROUTES.includes(r.source)) bad.push(`source is a hub: ${r.source}`);
      if (!anchorOk(r.destination)) bad.push(`bad anchor: ${r.source} -> ${r.destination}`);
      const destPath = r.destination.split("?")[0]!;
      if (sources.has(destPath) && destPath !== r.source) bad.push(`chain: ${r.source} -> ${destPath}`);
    }
    expect(bad).toEqual([]);
  });

  it("consolidation redirects from the brief are present", async () => {
    const rules = (await nextConfig.redirects!()) as { source: string; destination: string }[];
    const get = (src: string) => rules.find((r) => r.source === src && !("has" in r))?.destination;
    expect(get("/macro/rbi")).toBe("/economy?section=rbi");
    expect(get("/macro")).toBe("/economy");
    expect(get("/markets/breadth")).toBe("/markets?section=breadth");
    expect(get("/intelligence/institutional")).toBe("/funds?section=institutional");
    expect(get("/research")).toBe("/companies?section=broker-consensus");
    expect(get("/markets/derivatives")).toBe("/trade?section=derivatives");
  });
});
