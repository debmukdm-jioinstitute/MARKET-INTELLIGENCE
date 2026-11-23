import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseNseIndexConstituentCsv } from "@/lib/feeds/india/nse-index-constituents";

const { feedFetchMock } = vi.hoisted(() => ({ feedFetchMock: vi.fn() }));
vi.mock("@/lib/feeds/http", () => ({ feedFetch: feedFetchMock }));

describe("parseNseIndexConstituentCsv", () => {
  it("reads the Symbol column", () => {
    const csv = "Company Name,Industry,Symbol,Series,ISIN Code\nFoo Ltd,IT,INFY,EQ,INE009A01021\nBar Ltd,Energy,RELIANCE,EQ,INE002A01018\n";
    expect(parseNseIndexConstituentCsv(csv)).toEqual(["INFY", "RELIANCE"]);
  });
});

describe("fetchNseIndexConstituentSymbols", () => {
  beforeEach(() => {
    vi.resetModules();
    feedFetchMock.mockReset();
  });

  it("falls back to nsearchives when archives returns HTML", async () => {
    feedFetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("://archives.nseindia.com/")) {
        return new Response("<!DOCTYPE html><html>nope</html>", { status: 200 });
      }
      if (String(url).includes("://nsearchives.nseindia.com/")) {
        return new Response(
          "Company Name,Industry,Symbol,Series,ISIN Code\nFoo Ltd,IT,INFY,EQ,INE009A01021\n",
          { status: 200 },
        );
      }
      return new Response("no", { status: 404 });
    });
    const { fetchNseIndexConstituentSymbols } = await import("@/lib/feeds/india/nse-index-constituents");
    await expect(fetchNseIndexConstituentSymbols("ind_nifty50list.csv")).resolves.toEqual(["INFY"]);
  });
});
