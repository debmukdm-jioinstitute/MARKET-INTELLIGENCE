import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCompanyAbout } from "../company-about";
afterEach(() => vi.unstubAllGlobals());

it("never returns an unrelated company from a fuzzy Wikipedia match", async () => {
  vi.stubGlobal("fetch", vi.fn(async (u: string | URL | Request) => {
    const url = String(u);
    if (url.includes("search/title")) return new Response(JSON.stringify({ pages: [{ title: "Hope & Co.", description: "Dutch bank" }] }));
    return new Response("{}", { status: 404 });
  }));
  expect(await fetchCompanyAbout("MEESHO LIMITED", { market: "IN" })).toBeNull();
});

it("accepts a Wikipedia page only when the title is the company and it is Indian", async () => {
  vi.stubGlobal("fetch", vi.fn(async (u: string | URL | Request) => {
    const url = String(u);
    if (url.includes("search/title")) return new Response(JSON.stringify({ pages: [{ title: "Acme Bank", description: "Bank in the United States" }, { title: "Zed Industries", description: "Indian industrial company" }] }));
    if (url.includes("summary/Zed_Industries")) return new Response(JSON.stringify({ title: "Zed Industries", description: "Indian industrial company", extract: "Zed Industries is an Indian company based in Pune." }));
    return new Response("{}", { status: 404 });
  }));
  expect((await fetchCompanyAbout("ZED INDUSTRIES LTD", { market: "IN" }))?.title).toBe("Zed Industries");
});

import { dropStaleFigures, isStale, statedYear } from "@/lib/feeds/company-about";
describe("stale filing blurbs", () => {
  const zomato = "Incorporated in 2010, Zomato Limited is one of the leading online Food Service platforms. As of December 31, 2020, Zomato has established a strong footprint across 23 countries with 131,233 restaurants.";
  it("finds the stated as-of year", () => {
    expect(statedYear(zomato)).toBe(2020);
    expect(statedYear("No dates here.")).toBeNull();
  });
  it("flags blurbs older than two years and drops the stale-figure sentence", () => {
    expect(isStale(zomato, 2026)).toBe(true);
    expect(isStale("As of March 31, 2026, we had 40 plants.", 2026)).toBe(false);
    const out = dropStaleFigures(zomato, 2026);
    expect(out).toContain("leading online Food Service platforms");
    expect(out).not.toContain("131,233");
  });
});
