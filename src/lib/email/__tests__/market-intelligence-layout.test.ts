import { describe, expect, it } from "vitest";
import { renderGrantEmail } from "@/lib/retargeting/grant-templates";
import { renderMarketIntelligenceEmail } from "../market-intelligence-layout";

describe("market-intelligence-layout", () => {
  it("renders grant daily pass matching official shell", () => {
    const { html, subject } = renderGrantEmail(
      { email: "deb@test.com", name: "Debabrata Mukherjee" },
      {
        firstName: "Debabrata",
        grantedPlanId: "day_pass",
        expiresAtIso: "2026-10-06T18:30:00.000Z",
        siteUrl: "https://getmarketintelligence.in",
        personalNote: "",
      },
    );
    expect(subject).toContain("Daily Pass");
    expect(html).toContain("DAILY PASS ACTIVATED");
    expect(html).toContain("Your Daily Pass is ready.");
    expect(html).toContain("Hey Debabrata,");
    expect(html).toContain("Valid until");
    expect(html).toContain("Open your dashboard");
    expect(html).toContain("View plans");
    expect(html).toContain('"Google Sans"');
  });

  it("renders yearly grant badge", () => {
    const { html } = renderGrantEmail(
      { email: "a@b.com", name: "A" },
      {
        firstName: "A",
        grantedPlanId: "pro_annual",
        expiresAtIso: "2027-10-06T18:30:00.000Z",
        siteUrl: "https://getmarketintelligence.in",
        personalNote: "",
      },
    );
    expect(html).toContain("YEARLY PASS ACTIVATED");
  });

  it("includes Mi lockup in shell", () => {
    const html = renderMarketIntelligenceEmail({ title: "Test", bodyHtml: "<p>x</p>" });
    expect(html).toContain("Market intelligence");
    expect(html).toContain("Founder, Market Intelligence");
  });
});
