import { describe, expect, it } from "vitest";
import { resolvePageProvenance } from "@/lib/feeds/page-provenance";

describe("resolvePageProvenance", () => {
  it("maps research-reports not to generic research", () => {
    const p = resolvePageProvenance("/research-reports");
    expect(p?.summary).toMatch(/Broker research/i);
  });

  it("maps macro section paths", () => {
    const p = resolvePageProvenance("/macro/employment");
    expect(p?.summary).toMatch(/Macro section/i);
  });

  it("skips profile", () => {
    expect(resolvePageProvenance("/profile")).toBeNull();
  });

  it("home cockpit sources", () => {
    const p = resolvePageProvenance("/Home");
    expect(p!.chips.length).toBeGreaterThan(3);
  });
});
