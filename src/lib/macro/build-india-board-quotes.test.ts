import { describe, expect, it } from "vitest";
import { overlayIndiaBoardFields } from "./build-india-board-quotes";

describe("overlayIndiaBoardFields", () => {
  const nifty = {
    volume: 412_000_000,
    dayLow: 22_540.1,
    dayHigh: 22_710.4,
    week52Low: 21_137.6,
    week52High: 26_277.3,
  };

  it("returns Yahoo range and volume for a known symbol", () => {
    expect(overlayIndiaBoardFields("^NSEI", { "^NSEI": nifty })).toEqual(nifty);
  });

  it("does not coerce missing fields to zero", () => {
    expect(overlayIndiaBoardFields("^INDIAVIX", {})).toEqual({
      volume: null,
      dayLow: null,
      dayHigh: null,
      week52Low: null,
      week52High: null,
    });
  });

  it("returns nulls when no Yahoo symbol is mapped", () => {
    expect(overlayIndiaBoardFields(undefined, { "^NSEI": nifty })).toEqual({
      volume: null,
      dayLow: null,
      dayHigh: null,
      week52Low: null,
      week52High: null,
    });
  });
});
