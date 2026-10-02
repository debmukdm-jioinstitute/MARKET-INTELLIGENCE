import { describe, expect, it } from "vitest";
import { buildRiskChecklist } from "@/lib/research/legal-risk";
import { entitiesFromTitle, matchEvents, parseSebiDate, parseSebiListing } from "@/lib/collector/legal-risk";
import { buildSymbolResolver } from "@/lib/collector/broker-calls";
import { categorize } from "@/lib/collector/announcements";

describe("SEBI listing parsing", () => {
  const html = `<tr role='row' class='odd'><td>Jul 09, 2026</td><td><a href='https://www.sebi.gov.in/enforcement/orders/jul-2026/x_1.html'  target="_blank" title="Ex-Parte Interim Order in the matter of Osiajee Texfab Limited" class='points'>x</a></td></tr>
  <tr><td>Sep 28, 2026</td><td><a href="https://www.sebi.gov.in/sebi_data/attachdocs/sep-2026/O.pdf" target="_blank" title="Final order in the matter of Adani Group Companies for alleged MPS violation" class="points"> x</a></td></tr>`;
  it("parses single- and double-quoted rows", () => {
    const items = parseSebiListing(html);
    expect(items.map((i) => i.date)).toEqual(["2026-07-09", "2026-09-28"]);
    expect(items[0].url).toContain("x_1.html");
    expect(parseSebiDate("garbage")).toBeNull();
  });
  it("extracts entity names from titles", () => {
    expect(entitiesFromTitle("Exemption Order in the matter of Bharat Rasayan Limited")).toContain("Bharat Rasayan Limited");
    expect(entitiesFromTitle("Final order in the matter of Adani Group Companies for alleged MPS violation")[0]).toBe("Adani Group Companies");
    expect(entitiesFromTitle("Adjudication Order in the matter of Shares Bazaar Pvt. Ltd. - Research Analyst")[0]).toBe("Shares Bazaar Pvt. Ltd.");
    expect(entitiesFromTitle("Appeal No. 7073 of 2026 filed by Ramesh B")).toEqual([]);
  });
  it("matches only entities that resolve to a listed company", () => {
    const resolve = buildSymbolResolver([{ symbol: "BHARATRAS", name: "BHARAT RASAYAN LTD" }]);
    const rows = matchEvents(
      [
        { date: "2026-06-12", title: "Exemption Order in the matter of Bharat Rasayan Limited", url: "u1" },
        { date: "2026-06-11", title: "Order in the matter of Some Private Person", url: "u2" },
      ],
      "SEBI order",
      resolve,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ symbol: "BHARATRAS", documentUrl: "u1", source: "SEBI" });
  });
});

describe("NSE legal categories (deterministic)", () => {
  it("maps NSE's own category names", () => {
    expect(categorize("Pendency of Litigation(s)/dispute(s) or the outcome impacting the Company", "x")).toBe("Regulatory / legal action");
    expect(categorize("Corporate Insolvency Resolution Process", "x")).toBe("Regulatory / legal action");
    expect(categorize("Action(s) initiated or orders passed", "x")).toBe("Regulatory / legal action");
    expect(categorize("General Updates", "Intimation of default in payment of interest")).toBe("Default / delay");
    expect(categorize("Updates", "Resignation of statutory auditor")).toBe("Auditor change");
    expect(categorize("Resignation of Director/KMP/SMP", "x")).toBe("Management change");
    expect(categorize("Copy of Newspaper Publication", "x")).toBeNull();
  });
});

describe("risk checklist", () => {
  const out = buildRiskChecklist({
    sebi: [{ id: "1", eventType: "SEBI order", title: "Order in the matter of X Limited", eventDate: "2026-06-12", documentUrl: "https://sebi/x.pdf" }],
    filings: [
      { id: "a", headline: "Default in payment of interest", category: "Default / delay", broadcastDate: "2026-09-01", attachmentUrl: "https://nse/a.pdf", taxonomyLabels: null },
      { id: "b", headline: "Board meeting outcome", category: "Board meeting", broadcastDate: "2026-09-02", attachmentUrl: null, taxonomyLabels: ["litigation"] },
      { id: "c", headline: "Dividend", category: "Dividend / bonus / split", broadcastDate: "2026-09-03", attachmentUrl: null, taxonomyLabels: ["routine"] },
    ],
    ratingEvents: [{ type: "negative-outlook", agency: "CRISIL", date: "2026-08-01", rating: "AA", detail: "CRISIL gave a negative outlook on AA.", link: "https://r", source: "RETAILBONDS" }, { type: "disclosure", agency: null, date: "2026-08-02", rating: null, detail: "x", link: null, source: "NSE_FILING" }],
  });
  it("orders by severity then date and links every row", () => {
    expect(out.map((i) => i.severity)).toEqual(["high", "review", "review", "info"]);
    expect(out[0].label).toBe("Default or delay in a filing");
    expect(out.find((i) => i.source === "SEBI")?.quote).toBe("Order in the matter of X Limited");
  });
  it("labels AI tags as automatic and never invents rows for routine filings", () => {
    const ai = out.find((i) => i.source === "NSE filing (AI-tagged)")!;
    expect(ai.severity).toBe("info");
    expect(ai.explanation).toMatch(/can be wrong/);
    expect(out.some((i) => i.id === "nse-ai-c")).toBe(false);
  });
});
