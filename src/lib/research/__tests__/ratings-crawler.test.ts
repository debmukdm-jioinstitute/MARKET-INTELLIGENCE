import { describe, expect, it } from "vitest";
import { candidateSlugs, agencyVerificationUrl, getCompanyCreditRatings } from "@/lib/research/ratings-crawler";

describe("ratings-crawler", () => {
  it("generates appropriate candidate slugs for RetailBonds lookups", () => {
    const slugs = candidateSlugs("RELIANCE", "Reliance Industries Ltd.");
    expect(slugs).toContain("reliance-industries-ltd");
    expect(slugs).toContain("reliance-industries-limited");
    expect(slugs).toContain("reliance");
  });

  it("handles complex company names with ampersands and punctuation", () => {
    const slugs = candidateSlugs("LT", "Larsen & Toubro Ltd.");
    expect(slugs).toContain("larsen-and-toubro-ltd");
    expect(slugs).toContain("larsen-and-toubro-limited");
    expect(slugs).toContain("lt");
  });

  it("generates correct official agency verification portal URLs", () => {
    const crisil = agencyVerificationUrl("CRISIL", "RELIANCE", "Reliance Industries Ltd.");
    expect(crisil).toContain("crisil.com");
    expect(crisil).toContain("RELIANCE");

    const care = agencyVerificationUrl("CARE", "RELIANCE", "Reliance Industries Ltd.");
    expect(care).toContain("careratings.com");
    expect(care).toContain("Reliance%20Industries%20Ltd.");

    const icra = agencyVerificationUrl("ICRA", "RELIANCE", "Reliance Industries Ltd.");
    expect(icra).toContain("icra.in");
    expect(icra).toContain("Reliance%20Industries%20Ltd.");

    const fallback = agencyVerificationUrl("UNKNOWN", "RELIANCE", "Reliance Industries Ltd.");
    expect(fallback).toContain("nseindia.com");
  });

  it("returns deterministic structured agency grid for any symbol", async () => {
    // Unknown or mock test symbol
    const result = await getCompanyCreditRatings("UNKNOWNTEST");
    expect(result).toHaveProperty("symbol", "UNKNOWNTEST");
    expect(result).toHaveProperty("agencies");
    expect(result.agencies).toHaveLength(3);
    expect(result.agencies.map((a) => a.agency)).toEqual(["CRISIL", "CARE", "ICRA"]);
    expect(result).toHaveProperty("events");
    expect(Array.isArray(result.events)).toBe(true);
    expect(typeof result.alert).toBe("boolean");
  });
});
