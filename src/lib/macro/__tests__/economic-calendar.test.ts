import { describe, expect, it } from "vitest";
import { buildPayload, mapFeedRows } from "../economic-calendar";

const NOW = new Date("2026-10-08T12:00:00Z").getTime();
const rows = [
  { title: "Core CPI m/m", country: "USD", date: "2026-10-09T08:30:00-04:00", impact: "High", forecast: "0.3%", previous: "0.2%" },
  { title: "Bank Holiday", country: "CNY", date: "2026-10-09T19:01:00-04:00", impact: "Holiday", forecast: "", previous: "" },
  { title: "German GDP", country: "EUR", date: "2026-10-05T03:00:00-04:00", impact: "Medium", forecast: "", previous: "0.1%" },
  { title: "Broken", country: "XXX", date: "not-a-date", impact: "High" },
];

describe("economic calendar (live feed mapper)", () => {
  const events = mapFeedRows(rows, NOW);

  it("keeps only valid scored events (drops holidays and malformed rows)", () => {
    expect(events.map((e) => e.event)).toEqual(["German GDP", "Core CPI m/m"]);
  });

  it("never invents numbers: missing forecast or actual is an em dash", () => {
    const gdp = events.find((e) => e.event === "German GDP")!;
    expect(gdp.forecast).toBe("—");
    expect(gdp.actual).toBe("—");
    expect(events.find((e) => e.event === "Core CPI m/m")!.forecast).toBe("0.3%");
  });

  it("resolves status from the clock and sorts chronologically", () => {
    expect(events[0]!.status).toBe("reported");
    expect(events[1]!.status).toBe("upcoming");
    expect(events[1]!.region).toBe("USA");
  });

  it("counts match and India is empty until a real India source exists", () => {
    const p = buildPayload(events, NOW);
    expect(p.counts.total).toBe(2);
    expect(p.counts.india).toBe(0);
  });
});
