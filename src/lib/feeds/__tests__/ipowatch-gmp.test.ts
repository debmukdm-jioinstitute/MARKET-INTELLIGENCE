import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/feeds/http", () => ({
  feedFetch: vi.fn(async () => {
    const html = readFileSync(
      new URL("./fixtures/ipowatch-gmp-sample.html", import.meta.url),
      "utf8",
    );
    return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
  }),
}));

describe("ipo watch gmp scrape", () => {
  it("parses GMP rows and matches by name", async () => {
    const { fetchIpoWatchGmp, matchGmpToName } = await import("@/lib/feeds/sources/ipowatch-gmp");
    const rows = await fetchIpoWatchGmp();
    expect(rows.length).toBeGreaterThan(3);
    expect(rows.some((r) => r.gmpInr != null)).toBe(true);
    const hit = matchGmpToName(rows, "Acevector", "ACEVECTOR");
    expect(hit?.name.toLowerCase()).toContain("acevector");
    expect(hit?.gmpInr).toBe(2);
  });
});
