import { describe, expect, it } from "vitest";
import { isGuestReadablePortalPath } from "../public-routes";

describe("isGuestReadablePortalPath", () => {
  it("allows market hubs and constituent drill-downs", () => {
    expect(isGuestReadablePortalPath("/markets")).toBe(true);
    expect(isGuestReadablePortalPath("/markets/india")).toBe(true);
    expect(isGuestReadablePortalPath("/markets/india/nifty-50")).toBe(true);
    expect(isGuestReadablePortalPath("/markets/sectors")).toBe(true);
    expect(isGuestReadablePortalPath("/markets/breadth")).toBe(true);
    expect(isGuestReadablePortalPath("/markets/derivatives")).toBe(true);
  });

  it("allows research hubs and company deep dives", () => {
    expect(isGuestReadablePortalPath("/research")).toBe(true);
    expect(isGuestReadablePortalPath("/research/RELIANCE")).toBe(true);
    expect(isGuestReadablePortalPath("/research/ipo")).toBe(true);
    expect(isGuestReadablePortalPath("/research/offers")).toBe(true);
    expect(isGuestReadablePortalPath("/research/ai-desk")).toBe(true);
  });

  it("allows macro, intelligence, and data hubs", () => {
    expect(isGuestReadablePortalPath("/macro")).toBe(true);
    expect(isGuestReadablePortalPath("/macro/india")).toBe(true);
    expect(isGuestReadablePortalPath("/intelligence")).toBe(true);
    expect(isGuestReadablePortalPath("/intelligence/scanner")).toBe(true);
    expect(isGuestReadablePortalPath("/data")).toBe(true);
  });

  it("blocks private portal routes that require authentication", () => {
    expect(isGuestReadablePortalPath("/portfolio")).toBe(false);
    expect(isGuestReadablePortalPath("/portfolio/trades")).toBe(false);
    expect(isGuestReadablePortalPath("/profile")).toBe(false);
    expect(isGuestReadablePortalPath("/algo")).toBe(false);
    expect(isGuestReadablePortalPath("/onboarding")).toBe(false);
  });
});
