import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HUBS } from "@/lib/hubs";
import { LEGACY_ROUTES } from "@/lib/legacy-routes";
import { ALL_NAV_SECTIONS, pathOf } from "@/lib/nav-columns";
import { PUBLIC_SITEMAP_STATIC } from "@/lib/seo/public-routes";

/** Every page route in src/app, as a regex per route (route groups dropped, [x] = one segment). */
function pageRoutes(): RegExp[] {
  const out: RegExp[] = [];
  const walk = (dir: string, segs: string[]) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, /^\(.*\)$/.test(name) ? segs : [...segs, name]);
      else if (name === "page.tsx") out.push(new RegExp(`^/${segs.map((s) => s.replace(/\[\.\.\.\w+\]/, ".+").replace(/\[\w+\]/, "[^/]+")).join("/")}$`.replace("^//", "^/")));
    }
  };
  walk(join(process.cwd(), "src/app"), []);
  return out;
}
const ROUTES = pageRoutes();
const exists = (path: string) => path === "/" || ROUTES.some((r) => r.test(path));
type Hub = { route: string; sections: readonly { id: string; label: string; subs?: readonly string[] }[] };
const hubByRoute = new Map<string, Hub>(Object.values(HUBS).map((h) => [h.route, h as Hub]));
const anchors = (h: Hub) => h.sections.flatMap((s) => [s.id, ...(s.subs ?? [])]);

/** Resolves "/hub?section=id" or a plain route; returns an error string or null. */
function check(href: string): string | null {
  const [path, query = ""] = href.split("?");
  const section = new URLSearchParams(query).get("section");
  const hub = hubByRoute.get(path!);
  if (section) return hub && anchors(hub).includes(section) ? null : `no section "${section}" on ${path}`;
  return exists(path!) ? null : `no page at ${path}`;
}

describe("site links", () => {
  it("the checker itself can fail", () => {
    expect(ROUTES.length).toBeGreaterThan(50);
    expect(check("/economy?section=nope")).not.toBeNull();
    expect(check("/does-not-exist")).not.toBeNull();
    expect(check("/economy?section=rbi")).toBeNull();
  });

  it("every legacy route lands on a real page or hub section", () => {
    expect(LEGACY_ROUTES.map((r) => [r.from, check(r.to)]).filter(([, e]) => e)).toEqual([]);
  });

  it("every nav link lands on a real page or hub section, never on a legacy URL", () => {
    const legacy = new Set(LEGACY_ROUTES.map((r) => r.from));
    const bad: string[] = [];
    for (const s of ALL_NAV_SECTIONS) for (const g of s.groups) for (const i of g.items) {
      if (i.external) continue;
      const e = check(i.href);
      if (e) bad.push(`${i.label}: ${e}`);
      if (legacy.has(pathOf(i.href))) bad.push(`${i.label}: uses legacy ${i.href}`);
    }
    expect(bad).toEqual([]);
  });

  it("nav labels and hub chips say the same thing", () => {
    const bad: string[] = [];
    for (const s of ALL_NAV_SECTIONS) for (const g of s.groups) for (const i of g.items) {
      const [path, q = ""] = i.href.split("?");
      const hub = hubByRoute.get(path!);
      const id = new URLSearchParams(q).get("section");
      const chip = hub?.sections.find((x) => x.id === id)?.label;
      if (chip && chip.toLowerCase() !== i.label.toLowerCase()) bad.push(`${i.label} != chip "${chip}"`);
    }
    expect(bad).toEqual([]);
  });

  it("every hub section is reachable from the menus (or is a teaser for a deep tool)", () => {
    const linked = new Set(ALL_NAV_SECTIONS.flatMap((s) => s.groups.flatMap((g) => g.items.map((i) => i.href))));
    const teasers = new Set(["today/hero", "today/pulse", "today/start-here", "markets/flows-teaser", "trade/scanner", "trade/lab", "trade/options-flow", "companies/ai-desk"]);
    const orphans = Object.entries(HUBS as Record<string, Hub>).flatMap(([key, h]) => h.sections.filter((s) => !teasers.has(`${key}/${s.id}`)).filter((s) => ![s.id, ...(s.subs ?? [])].some((a) => linked.has(`${h.route}?section=${a}`))).map((s) => `${key}/${s.id}`));
    expect(orphans).toEqual([]);
  });

  it("the XML sitemap lists only real pages that are not legacy URLs", () => {
    const legacy = new Set(LEGACY_ROUTES.map((r) => r.from));
    const bad = PUBLIC_SITEMAP_STATIC.map((s) => s.path).filter((p) => legacy.has(p) || !exists(p));
    expect(bad).toEqual([]);
  });
});
