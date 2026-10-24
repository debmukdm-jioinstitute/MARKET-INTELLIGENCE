import { describe, expect, it } from "vitest";
import { breadthDeck, breadthHeadline, indexDeck, indexHeadline, moved, rankDeck } from "@/lib/story";

describe("story", () => {
  it("moved words", () => {
    expect(moved(-0.0038)).toBe("fell 0.4%");
    expect(moved(0.012)).toBe("rose 1.2%");
    expect(moved(0.0001)).toBe("was flat");
    expect(moved(null)).toBe("");
  });
  const rows = [
    { name: "Nifty 50", changePct: -0.0038 },
    { name: "Smallcap 250", changePct: -0.0279 },
    { name: "Nifty Bank", changePct: 0.001 },
  ];
  it("index headline picks the benchmark and the biggest same-direction mover", () => {
    expect(indexHeadline(rows)).toBe("The Nifty 50 fell 0.4%; Smallcap 250 fell 2.8%");
    expect(indexHeadline([])).toBeNull();
  });
  it("index deck", () => {
    expect(indexDeck(rows)).toContain("1 of 3 indices rose");
    expect(indexDeck(rows)).toContain("weakest: Smallcap 250 (−2.79%)");
  });
  it("breadth", () => {
    expect(breadthHeadline(155, 1344)).toBe("Selling was broad: 155 stocks rose and 1,344 fell");
    expect(breadthHeadline(null, 3)).toBeNull();
    expect(breadthDeck(155, 1344, 1, 6, 276)).toContain("lows far outnumbering highs");
  });
  it("rank deck", () => {
    expect(rankDeck(rows, "sectors")).toBe("1 of 3 sectors rose. Nifty Bank led (+0.10%); Smallcap 250 trailed (−2.79%).");
  });
});

import { flowHeadline, macroDeck, pcrHeadline } from "@/lib/story";
describe("story flows/macro/pcr", () => {
  it("flows", () => {
    expect(flowHeadline(887.65, 3235.36)).toBe("Domestic institutions bought ₹3,235 cr and foreign investors bought ₹888 cr");
    expect(flowHeadline(-500, 200)).toBe("Foreign investors sold ₹500 cr while domestic institutions bought ₹200 cr");
    expect(flowHeadline(null, 1)).toBeNull();
  });
  it("macro", () => {
    expect(macroDeck([{ indicator: "CPI Inflation", current: 4.82, previous: 4.45, unit: "% y/y" }, { indicator: "PMI", current: 58, previous: 58, unit: "index" }])).toBe("CPI Inflation rose to 4.82% y/y from 4.45%.");
  });
  it("pcr", () => {
    expect(pcrHeadline("Nifty", 1.3, 22500)).toBe("Nifty put-call ratio is 1.30: puts clearly outnumber calls; max pain is 22,500");
    expect(pcrHeadline("Nifty", null)).toBeNull();
  });
});

import { curveDeck, flowPeriodDeck, rbiHeadline, yieldHeadline } from "@/lib/story";
describe("story yields/rbi/period", () => {
  const ind = [{ tenor: "10Y", value: 6.52 }];
  const us = [{ tenor: "10Y", value: 4.12 }, { tenor: "2Y", value: 4.4 }];
  it("yields", () => {
    expect(yieldHeadline(ind, us)).toBe("India's 10-year yield is 6.52% against 4.12% in the US, a gap of 2.40 points");
    expect(yieldHeadline([], us)).toBeNull();
    expect(curveDeck(us)).toBe("The US curve is inverted: the 10-year is 0.28 points below the 2-year.");
  });
  it("rbi", () => {
    expect(rbiHeadline("5.50%", "₹0.31 L Cr absorbed (surplus)")).toBe("The RBI's repo rate is 5.50%; system liquidity is ₹0.31 L Cr absorbed (surplus)");
    expect(rbiHeadline(null, "x")).toBeNull();
  });
  it("flow period", () => {
    expect(flowPeriodDeck({ today: 1, m1: -500, ytd: -9000 }, { today: 1, m1: 700, ytd: 12000 })).toBe(
      "Over the past month foreign investors net sold ₹500 cr and domestic institutions net bought ₹700 cr; year to date, foreign investors net sold ₹9,000 cr and domestic institutions net bought ₹12,000 cr.",
    );
  });
});

import { corridorDeck } from "@/lib/story";
it("corridor deck skips missing rates", () => {
  expect(corridorDeck({ sdf: "5.25%", msf: null, crr: "3.00%" })).toBe("Standing deposit facility 5.25%, CRR 3.00%.");
  expect(corridorDeck({})).toBeNull();
  expect(corridorDeck(undefined)).toBeNull();
});

it("period deck capitalises when only YTD exists; caps names get no 'The'", () => {
  expect(flowPeriodDeck({ today: 1, m1: null, ytd: -5 }, { today: 1, m1: null, ytd: 7 })).toBe("Year to date, foreign investors net sold ₹5 cr and domestic institutions net bought ₹7 cr.");
  expect(indexHeadline([{ name: "BRENT CRUDE", changePct: 0.028 }], /brent/i)).toBe("BRENT CRUDE rose 2.8%");
});

import { glanceLine } from "@/lib/story";
import { dmy } from "@/lib/format";
describe("index overview helpers", () => {
  it("glance", () => {
    expect(glanceLine(-4.4, [12.4, 13.1, 15.2])).toBe("Down over one year. Positive annualised returns over longer periods.");
    expect(glanceLine(5, [-1, 2])).toBe("Up over one year. Mixed annualised returns over longer periods.");
    expect(glanceLine(null, [1])).toBeNull();
  });
  it("dmy", () => {
    expect(dmy("from 2 Jan 2008 to 9 March 2009")).toBe("from 02-01-2008 to 09-03-2009");
    expect(dmy("since Oct 2026")).toBe("since 01-10-2026");
    expect(dmy("Since 2005")).toBe("Since 2005");
  });
});
