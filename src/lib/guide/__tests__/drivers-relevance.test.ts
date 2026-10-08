import { describe, expect, it } from "vitest";
import { driversFor, linesFor } from "../business-lines";
import * as driversService from "../drivers-service";

describe("US big-tech line mapping", () => {
  it('maps MSFT ("Microsoft Corporation") to it-services first, not the generic line', () => {
    const lines = linesFor("MSFT", "Microsoft Corporation");
    expect(lines[0].id).toBe("it-services");
  });
  it("resolves MSFT to sector drivers (H-1B/visa, client budgets, genAI, USD-INR)", () => {
    const ids = driversFor(linesFor("MSFT", "Microsoft Corporation"), 7).map((d) => d.id);
    expect(ids).toContain("us-visa");
    expect(ids).toContain("client-budgets");
    expect(ids).toContain("genai");
    expect(ids).toContain("usd-inr");
  });
  it("spot-checks GOOGL and NVDA land on it-services too", () => {
    expect(linesFor("GOOGL", "Alphabet Inc")[0].id).toBe("it-services");
    expect(linesFor("NVDA", "NVIDIA Corporation")[0].id).toBe("it-services");
  });
});

describe("sector-blind backfill and fabricated evidence removal", () => {
  it("no longer exports getReferenceEvidence (no fabricated fallback headlines)", () => {
    expect((driversService as Record<string, unknown>).getReferenceEvidence).toBeUndefined();
  });
  it("no longer exports SUPPLEMENTARY_DRIVERS (no sector-blind 6-card backfill)", () => {
    expect((driversService as Record<string, unknown>).SUPPLEMENTARY_DRIVERS).toBeUndefined();
  });
});
