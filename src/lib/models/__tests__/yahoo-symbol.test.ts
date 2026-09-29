import { describe, expect, it } from "vitest";
import { preferredYahooTicker } from "@/lib/models/yahoo-fundamentals";

describe("preferredYahooTicker", () => {
  it("uses NSE suffix for India universe symbols", () => {
    expect(preferredYahooTicker("INFY")).toBe("INFY.NS");
    expect(preferredYahooTicker("reliance")).toBe("RELIANCE.NS");
  });

  it("leaves US and suffixed tickers unchanged", () => {
    expect(preferredYahooTicker("AAPL")).toBe("AAPL");
    expect(preferredYahooTicker("INFY.NS")).toBe("INFY.NS");
    expect(preferredYahooTicker("^NSEI")).toBe("^NSEI");
  });
});
