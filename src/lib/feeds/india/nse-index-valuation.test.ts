import { describe, expect, it } from "vitest";
import { parseNifty50ValuationFromArchiveCsv } from "./nse-index-valuation";

describe("parseNifty50ValuationFromArchiveCsv", () => {
  it("reads Nifty 50 P/E, P/B and dividend yield", () => {
    const csv = `Index Name,Index Date,Open Index Value,High Index Value,Low Index Value,Closing Index Value,Points Change,Change(%),Volume,Turnover (Rs. Cr.),P/E,P/B,Div Yield
Nifty 50,25-09-2026,23035,23162.7,23020.95,23140.5,77.4,.34,242720711,18949.25,19.56,2.8,1.22
Nifty Next 50,25-09-2026,71387.45,71778.65,71197,71778.65,397.2,.56,133200757,6988.86,18.97,3.19,1.01`;
    const out = parseNifty50ValuationFromArchiveCsv(csv);
    expect(out).toEqual({
      pe: 19.56,
      pb: 2.8,
      divYield: 1.22,
      indexDate: "25-09-2026",
    });
  });
});
