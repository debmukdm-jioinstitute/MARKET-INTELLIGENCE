import { afterEach, expect, it, vi } from "vitest";
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
