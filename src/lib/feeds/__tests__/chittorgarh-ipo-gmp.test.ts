import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/feeds/http", () => ({
  feedFetch: vi.fn(async (url: string) => {
    if (String(url).includes("investorgain.com")) {
      const html = readFileSync(
        new URL("./fixtures/investorgain-gmp-sample.html", import.meta.url),
        "utf8",
      );
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    }
    if (String(url).includes("chittorgarh.com")) {
      const html = readFileSync(
        new URL("./fixtures/chittorgarh-ipo-dashboard-sample.html", import.meta.url),
        "utf8",
      );
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    }
    return new Response("", { status: 404 });
  }),
}));

describe("chittorgarh ipo gmp scrape", () => {
  it("parses live GMP table and matches Snapdeal to Acevector row", async () => {
    const { fetchChittorgarhIpoGmp } = await import("@/lib/feeds/sources/chittorgarh-ipo-gmp");
    const { matchGmpToName } = await import("@/lib/feeds/sources/ipowatch-gmp");
    const rows = await fetchChittorgarhIpoGmp();
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.some((r) => r.gmpInr != null && r.gmpInr > 0)).toBe(true);
    const hit = matchGmpToName(rows, "Snapdeal", "SNAPDEAL");
    expect(hit?.name.toLowerCase()).toContain("acevector");
    expect(hit?.gmpInr).toBe(0.5);
  });
});

describe("parseInvestorGainGmpTable", () => {
  it("reads GMP INR and price band from data-label cells", async () => {
    const html = readFileSync(
      new URL("./fixtures/investorgain-gmp-sample.html", import.meta.url),
      "utf8",
    );
    const { parseInvestorGainGmpTable } = await import("@/lib/feeds/sources/chittorgarh-ipo-gmp");
    const rows = parseInvestorGainGmpTable(html);
    const ace = rows.find((r) => r.name.includes("Acevector"));
    expect(ace?.gmpInr).toBe(0.5);
    expect(ace?.priceBandInr).toBe(32);
    expect(ace?.estListingGainPct).toBe(1.56);
  });
});
