import { describe, expect, it } from "vitest";
import { computeOwnershipFlags, type OwnershipRow } from "@/lib/research/ownership";

const row = (broadcastDate: string, quarterEnd: string, promoterPct: number | null, pledgePct: number | null): OwnershipRow => ({
  broadcastDate, quarterEnd, promoterPct, fiiPct: null, diiPct: null, publicPct: null, pledgePct, shareholderCount: null, xbrlUrl: `https://x/${broadcastDate}.xml`,
});

describe("computeOwnershipFlags", () => {
  it("flags pledge above 20% as high", () => {
    const f = computeOwnershipFlags([row("2026-04-20", "2026-03-31", 50, 26)]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ label: "Promoter Risk", severity: "high", filingUrl: "https://x/2026-04-20.xml" });
  });
  it("flags a +5pp pledge rise as medium and quotes both quarters", () => {
    const f = computeOwnershipFlags([row("2026-01-20", "2025-12-31", 50, 8), row("2026-04-20", "2026-03-31", 50, 14)]);
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("medium");
    expect(f[0].detail).toContain("rose from 8% to 14%");
    expect(f[0].detail).toContain("Dec 2025");
  });
  it("merges level + rise into one high flag and keeps the rise wording", () => {
    const f = computeOwnershipFlags([row("2026-01-20", "2025-12-31", 50, 8), row("2026-04-20", "2026-03-31", 50, 26)]);
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("high");
    expect(f[0].detail).toContain("rose from 8% to 26%");
  });
  it("flags promoter selling above 2pp only", () => {
    expect(computeOwnershipFlags([row("a1", "2025-12-31", 60, null), row("a2", "2026-03-31", 58.5, null)])).toHaveLength(0);
    const f = computeOwnershipFlags([row("2026-01-20", "2025-12-31", 60, null), row("2026-04-20", "2026-03-31", 57, null)]);
    expect(f[0]).toMatchObject({ label: "Promoter selling", severity: "medium" });
  });
  it("never flags on unknown pledge and returns newest first", () => {
    expect(computeOwnershipFlags([row("2026-01-20", "2025-12-31", 50, null), row("2026-04-20", "2026-03-31", 50, null)])).toEqual([]);
    const f = computeOwnershipFlags([row("2026-01-20", "2025-12-31", 50, 30), row("2026-04-20", "2026-03-31", 50, 40)]);
    expect(f.map((x) => x.broadcastDate)).toEqual(["2026-04-20", "2026-01-20"]);
  });
});
