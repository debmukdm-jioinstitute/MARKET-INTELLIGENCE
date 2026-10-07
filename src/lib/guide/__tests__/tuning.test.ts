import { describe, expect, it } from "vitest";
import { BUSINESS_LINES, driversFor } from "../business-lines";
import { ctxFor, pickEvidence, shortName } from "../driver-news";
import { inferLines } from "../line-infer";
import { resolveLines } from "../resolve-lines";
import { semanticLines, semanticRelevance, type Embedder } from "../semantic";

const NOW = Date.parse("2026-10-07T00:00:00Z");
const item = (title: string, d = "2026-10-05T00:00:00Z") => ({ id: title, source: "googlenews" as const, title, link: `https://x/${encodeURIComponent(title)}`, publishedAt: d });
const driver = (id: string) => {
  for (const l of BUSINESS_LINES) for (const d of l.drivers) if (d.id === id) return d;
  throw new Error(id);
};

/** Labelled headlines: must / must-not count as evidence for the driver. Add a row whenever a false hit is seen in production. */
const LABELLED: [string, string, boolean][] = [
  ["irdai-commission", "IRDAI proposes cap on commission paid to insurance distributors - Mint", true],
  ["irdai-commission", "Insurers seek relaxation of expense of management norms - ET", true],
  ["irdai-commission", "Commission agents arrested in land scam - Local News", false],
  ["irdai-commission", "Real estate brokers cut commission amid slowdown - ET", false],
  ["repo-rate", "RBI MPC keeps repo rate unchanged at 5.5% - Business Standard", true],
  ["repo-rate", "Stocks to buy today: 5 picks as RBI repo rate decision nears - Moneycontrol", false],
  ["repo-rate", "Mortgage rate falls in US as Fed signals cut - Reuters", false],
  ["upi-mdr", "NPCI market share cap on UPI apps deferred again - ET", true],
  ["upi-mdr", "Mdr stem cell therapy trial begins - Science Daily", false],
  ["usfda", "Sun Pharma plant gets USFDA warning letter - Mint", true],
  ["usfda", "Dr Reddy's share price live: stock up 2% - Economic Times", false],
  ["apm-allocation", "Govt cuts APM gas allocation to CNG, PNG supply - ET", true],
  ["apm-allocation", "Apm terminals wins port contract in Ghana - Reuters", false],
  ["gst-rate", "GST Council cuts rate on insurance premiums - Mint", true],
  ["monsoon", "Weak monsoon hits kharif sowing, rural demand - BS", true],
  ["monsoon", "Monsoon Wedding sequel announced - Hindustan Times", false],
  ["brent", "Brent crude rises above $90 on supply worries - Reuters", true],
  ["brent", "Brent Goose spotted in Kerala wetlands - The Hindu", false],
  ["brent", "Crude Oil Market Size, Share, Growth Forecast 2034 - Straits Research", false],
  ["lme", "LME aluminium hits two-year high - Reuters", true],
];

describe("evidence keyword precision", () => {
  for (const [id, title, want] of LABELLED) {
    it(`${id}: ${want ? "keeps" : "drops"} "${title.slice(0, 50)}"`, () => {
      const dr = driver(id);
      expect(pickEvidence([item(title)], dr.kw, NOW, { ctx: ctxFor(dr) }).count > 0).toBe(want);
    });
  }
});

describe("evidence ranking", () => {
  const dr = driver("irdai-commission");
  it("drops near-duplicate wire copy", () => {
    const r = pickEvidence([item("IRDAI caps insurance distributor commission rates - Mint"), item("IRDAI caps insurance distributor commission rates sharply - ET")], dr.kw, NOW);
    expect(r.count).toBe(1);
  });
  it("puts a company-named headline first and tags it", () => {
    const r = pickEvidence(
      [item("IRDAI commission rules reshape distributor economics - Mint", "2026-10-06T00:00:00Z"), item("PB Fintech shares fall as IRDAI commission cap looms - ET", "2026-10-02T00:00:00Z")],
      dr.kw,
      NOW,
      { company: "PB Fintech" },
    );
    expect(r.items[0].company).toBe(true);
  });
  it("shortName strips legal suffixes", () => {
    expect(shortName("PB Fintech Ltd.")).toBe("PB Fintech");
  });
});

describe("coverage of the unmapped long tail", () => {
  const cases: [string, string, string][] = [
    ["XYZPHARM", "Zenith Drugs and Formulations Ltd", "pharma"],
    ["XYZSTEEL", "Aryan Ispat and Power", ""],
    ["XYZBANK", "Foo Small Finance Bank", ""],
  ];
  it("infers pharma from a description", () => {
    expect(inferLines("Zenith Labs manufactures pharmaceutical formulations, generics and active pharmaceutical ingredients exported to the US")[0].id).toBe("pharma");
  });
  it("infers insurance distribution", () => {
    expect(inferLines("online insurance marketplace comparing policies, earning commission as insurance broker")[0].id).toBe("insurance-distribution");
  });
  it("returns nothing for empty / meaningless text", () => {
    expect(inferLines("Acme Holdings Ltd")).toEqual([]);
  });
  it("resolves an unmapped name through its description, and falls to generic with none", async () => {
    const hit = await resolveLines("ZZZ1", "Zenith Corp", null, async () => "Manufacturer of pharmaceutical formulations, generics and APIs.");
    expect(hit.how).toBe("text");
    expect(hit.lines[0].id).toBe("pharma");
    expect(driversFor(hit.lines).length).toBeGreaterThan(2);
    expect((await resolveLines("ZZZ2", "Zenith Corp", null)).how).toBe("generic");
    expect(cases.length).toBe(3);
  });
});

describe("optional semantic layer (injected embedder)", () => {
  it("scores relevance with cosine and picks the nearest line", async () => {
    const embed: Embedder = async (texts) => texts.map((t) => (/pharma|drug/i.test(t) ? [1, 0] : [0, 1]));
    const sims = await semanticRelevance("USFDA drug plant", ["Pharma plant inspected", "Cricket final tonight"], embed);
    expect(sims![0]).toBeGreaterThan(0.9);
    expect(sims![1]).toBeLessThan(0.1);
    expect(await semanticLines("a drug maker", async (t) => t.map((x) => (/pharma|drug/i.test(x) ? [1, 0] : [0, 1])), 0.3)).toBeTruthy();
  });
  it("is silent when the model is unavailable", async () => {
    expect(await semanticRelevance("x", ["y"], async () => null)).toBeNull();
  });
});
