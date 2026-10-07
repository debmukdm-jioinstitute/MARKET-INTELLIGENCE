import { describe, expect, it } from "vitest";
import { BUSINESS_LINES, driversFor, linesFor } from "../business-lines";
import { pickEvidence } from "../driver-news";
import { NIFTY_500 } from "@/lib/prowess/nifty500";

describe("linesFor", () => {
  it("maps PolicyBazaar to insurance distribution with IRDAI drivers", () => {
    const lines = linesFor("POLICYBZR", "PB Fintech Ltd.", "Financial Services");
    expect(lines[0].id).toBe("insurance-distribution");
    expect(driversFor(lines).some((d) => d.authority === "IRDAI")).toBe(true);
  });
  it("maps banks to RBI-driven lines, not generic", () => {
    const l = linesFor("AXISBANK", "Axis Bank Ltd.", "Financial Services");
    expect(l[0].id).toBe("bank-private");
    expect(driversFor(l).some((d) => d.authority === "RBI" && d.kind === "regulation")).toBe(true);
  });
  it("gives every Nifty-500 stock at least one non-generic line or a generic fallback with drivers", () => {
    let generic = 0;
    for (const [sym, name, ind] of NIFTY_500) {
      const l = linesFor(sym, name, ind);
      expect(driversFor(l).length).toBeGreaterThan(0);
      if (l[0].id === "broad-market") generic++;
    }
    expect(generic / NIFTY_500.length).toBeLessThan(0.35);
  });
  it("has valid regexes and unique driver ids per line", () => {
    for (const l of BUSINESS_LINES) {
      if (l.names) expect(() => new RegExp(l.names!, "i")).not.toThrow();
      expect(new Set(l.drivers.map((d) => d.id)).size).toBe(l.drivers.length);
      for (const d of l.drivers) expect(() => new RegExp(d.kw, "i")).not.toThrow();
    }
  });
});

describe("pickEvidence", () => {
  const now = Date.parse("2026-10-07T00:00:00Z");
  const item = (title: string, d: string) => ({ id: title, source: "googlenews" as const, title, link: `https://x/${title.length}`, publishedAt: d });
  it("keeps matching recent headlines, strips publisher, flags active", () => {
    const r = pickEvidence([item("IRDAI caps commission paid to insurance distributors - Mint", "2026-10-05T00:00:00Z"), item("Cricket scores today - ESPN", "2026-10-06T00:00:00Z")], "commission|distributor", now);
    expect(r.count).toBe(1);
    expect(r.items[0].source).toBe("Mint");
    expect(r.active).toBe(true);
  });
  it("drops stale items", () => {
    expect(pickEvidence([item("IRDAI commission cap rules for distributors - Mint", "2026-08-01T00:00:00Z")], "commission", now).count).toBe(0);
  });
});
