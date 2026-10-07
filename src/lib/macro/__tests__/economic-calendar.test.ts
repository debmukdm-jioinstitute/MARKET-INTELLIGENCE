import { describe, expect, it } from "vitest";
import { getEconomicCalendar } from "../economic-calendar";

describe("Economic Calendar & Sovereign Releases Engine", () => {
  it("generates a comprehensive sovereign release schedule extending well past September 30", async () => {
    const calendar = await getEconomicCalendar();

    expect(calendar.events.length).toBeGreaterThanOrEqual(25);
    expect(calendar.counts.total).toBe(calendar.events.length);
    expect(calendar.counts.india).toBeGreaterThan(10);
    expect(calendar.counts.usa).toBeGreaterThan(5);

    // Verify events exist in October 2026 and November 2026
    const octoberEvents = calendar.events.filter((e) => e.date.startsWith("Oct"));
    const novemberEvents = calendar.events.filter((e) => e.date.startsWith("Nov"));

    expect(octoberEvents.length).toBeGreaterThan(10);
    expect(novemberEvents.length).toBeGreaterThan(3);

    // Verify key sovereign events are present
    const rbiMpc = calendar.events.find((e) => e.id.includes("rbi-mpc-2026-10-09"));
    expect(rbiMpc).toBeDefined();
    expect(rbiMpc?.country).toBe("IND");
    expect(rbiMpc?.event).toContain("RBI MPC Rate Decision");

    const indiaCpi = calendar.events.find((e) => e.id.includes("ind-cpi-2026-10-12"));
    expect(indiaCpi).toBeDefined();
    expect(indiaCpi?.country).toBe("IND");
    expect(indiaCpi?.event).toContain("CPI Inflation Rate");

    const fomc = calendar.events.find((e) => e.id.includes("usa-fomc-rate-2026-10-28"));
    expect(fomc).toBeDefined();
    expect(fomc?.country).toBe("USA");
  });

  it("filters correctly by region and impact level", async () => {
    const indiaOnly = await getEconomicCalendar({ region: "IND" });
    expect(indiaOnly.events.every((e) => e.region === "IND")).toBe(true);

    const highImpact = await getEconomicCalendar({ impact: "HIGH" });
    expect(highImpact.events.every((e) => e.impact === "HIGH")).toBe(true);
  });

  it("formats dates properly into Indian Standard Time (IST)", async () => {
    const calendar = await getEconomicCalendar();
    for (const event of calendar.events) {
      expect(event.date).toMatch(/^[A-Z][a-z]{2} \d{2}, \d{2}:\d{2}$/);
      expect(event.isoDate).toBeDefined();
      expect(event.impact).toMatch(/^(HIGH|MEDIUM|LOW)$/);
      expect(event.status).toMatch(/^(reported|today|upcoming)$/);
    }
  });
});
