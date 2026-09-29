import { describe, expect, it } from "vitest";
import { parseEpfoPayrollFromText } from "@/lib/collector/sources/india-macro/epfo";
import { parseGstFromPressHtml } from "@/lib/collector/sources/india-macro/gst-pib";

describe("india-macro collectors", () => {
  it("parses GST press release crore amount", () => {
    const html = `<p>Gross GST revenue collected in the month of August 2026 is ₹ 1,87,369 crore.</p>`;
    const obs = parseGstFromPressHtml(html);
    expect(obs?.value).toBe(187369);
    expect(obs?.date).toBe("2026-08-01");
  });

  it("parses EPFO net payroll lakh", () => {
    const text = "During August 2026, EPFO records a net addition of 14.8 lakh subscribers.";
    const obs = parseEpfoPayrollFromText(text);
    expect(obs?.value).toBe(14.8);
    expect(obs?.date).toBe("2026-08-01");
  });
});
