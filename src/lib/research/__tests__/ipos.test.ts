import { describe, expect, it } from "vitest";
import { applyChecklist, computeMomentum, type SnapshotPoint } from "@/lib/research/ipos";
import { combineGmp, parseIpoWatch } from "@/lib/collector/ipo-gmp";
import { cleanCompany, companyKey, detailFrom, fromPast, fromUpcoming, nseDay, parseSebiFilings, priceBand, subscriptionFrom } from "@/lib/collector/ipos";

const snap = (hoursAgo: number, rii: number | null, total = 1): SnapshotPoint => ({ at: new Date(Date.parse("2026-10-03T12:00:00Z") - hoursAgo * 3_600_000).toISOString(), qibX: 0.1, niiX: 0.2, riiX: rii, totalX: total });

describe("subscription momentum", () => {
  it("computes day-over-day change and flags a retail spike", () => {
    const m = computeMomentum([snap(48, 0.2), snap(24, 0.5), snap(0, 2.0)]);
    expect(m.delta?.riiX).toBe(1.5);
    expect(m.heatingUp).toBe(true);
  });
  it("does not flag slow growth or missing history", () => {
    expect(computeMomentum([snap(24, 1.0), snap(0, 1.4)]).heatingUp).toBe(false);
    expect(computeMomentum([snap(0, 1.0)])).toMatchObject({ delta: null, heatingUp: false });
    expect(computeMomentum([]).latest).toBeNull();
  });
  it("computes the minimum application at the upper band", () => {
    expect(applyChecklist(68, 220)).toEqual({ lotSize: 68, minInvestmentInr: 14960 });
    expect(applyChecklist(null, 220).minInvestmentInr).toBeNull();
  });
});

describe("GMP: two sources, range on disagreement", () => {
  it("returns a point when the sources agree", () => {
    const g = combineGmp([{ provider: "A", gmpInr: 20 }, { provider: "B", gmpInr: 22 }], 200)!;
    expect(g.disagree).toBe(false);
    expect(g.value).toBe(21);
    expect(g.pct).toBe(10.5);
  });
  it("returns the range and no point when they differ by more than 20%", () => {
    const g = combineGmp([{ provider: "A", gmpInr: 10 }, { provider: "B", gmpInr: 30 }], 200)!;
    expect(g).toMatchObject({ disagree: true, value: null, pct: null, low: 10, high: 30 });
  });
  it("handles one source and none", () => {
    expect(combineGmp([{ provider: "A", gmpInr: 5 }, { provider: "B", gmpInr: null }], 100)).toMatchObject({ value: 5, sources: ["A"], disagree: false });
    expect(combineGmp([{ provider: "A", gmpInr: null }], 100)).toBeNull();
  });
  it("parses the IPO Watch table", () => {
    const html = `<table><tr><th>Company</th><th>GMP*</th><th>Trend</th><th>Price Band</th><th>Est. Gain</th><th>Date</th></tr>
      <tr><td>TNA Solutions (O) SME</td><td>₹6</td><td>🔴</td><td>₹70</td><td>₹76 (8.57%)</td><td>30-6 Oct</td></tr>
      <tr><td>Jio Platform (U) Mainboard</td><td>₹-</td><td>🟢</td><td>₹-</td><td>₹- (0.00%)</td><td>21-23 Oct*</td></tr></table>`;
    const rows = parseIpoWatch(html);
    expect(rows[0]).toMatchObject({ name: "TNA Solutions", gmpInr: 6, priceBandInr: 70, estListingGainPct: 8.57, status: "Open" });
    expect(rows[1].gmpInr).toBeNull();
  });
});

describe("pipeline parsing", () => {
  it("normalises company names across sources", () => {
    expect(cleanCompany("VISHAL NIRMITI LIMITED")).toBe("Vishal Nirmiti");
    expect(cleanCompany("Vishal Nirmiti Ltd.")).toBe("Vishal Nirmiti");
    expect(companyKey("Vishal Nirmiti Limited")).toBe(companyKey("VISHAL NIRMITI LTD"));
  });
  it("parses NSE dates and price bands", () => {
    expect(nseDay("30-SEP-2026")).toBe("2026-09-30");
    expect(nseDay("-")).toBeNull();
    expect(priceBand("Rs.208 to Rs.220")).toEqual({ low: 208, high: 220 });
    expect(priceBand("   405")).toEqual({ low: 405, high: 405 });
  });
  it("maps NSE upcoming/active/past rows to stages and drops debt issues", () => {
    expect(fromUpcoming({ companyName: "Vishal Nirmiti Limited", series: "EQ", status: "Active", issuePrice: "Rs.208 to Rs.220", issueSize: "8471153", issueStartDate: "30-Sep-2026", issueEndDate: "05-Oct-2026", symbol: "VNL" })).toMatchObject({ stage: "open", issueSize: 186.37, priceBandHigh: 220 });
    expect(fromUpcoming({ companyName: "X", series: "EQ", status: "Forthcoming" })?.stage).toBe("sebi_nod");
    expect(fromUpcoming({ companyName: "SMC Global Securities Limited", series: "DEBT", status: "Forthcoming" })).toBeNull();
    const now = Date.parse("2026-10-03T00:00:00Z");
    expect(fromPast({ company: "A", ipoEndDate: "30-SEP-2026", listingDate: "-", securityType: "EQ", priceRange: "Rs.1 to Rs.2" }, now)?.stage).toBe("allotment");
    expect(fromPast({ company: "A", ipoEndDate: "28-SEP-2026", listingDate: "01-OCT-2026", securityType: "EQ" }, now)?.stage).toBe("listed");
    expect(fromPast({ company: "Old", ipoEndDate: "01-JAN-2026", listingDate: "05-JAN-2026", securityType: "EQ" }, now)).toBeNull();
  });
  it("parses SEBI DRHP rows, skipping addenda", () => {
    const html = `<td>Oct 01, 2026</td><td><a href="https://sebi/x-drhp_1.html"  target="_blank" title="JAGATJIT AGRI ENGINEERING LIMITED - DRHP <br><a href= 'u.pdf'>x</a>" class="points">x</a>
      <td>Oct 01, 2026</td><td><a href="https://sebi/y_2.html"  target="_blank" title="Arohan Financial Services Limited - Addendum to DRHP" class="points">y</a>`;
    const rows = parseSebiFilings(html, "DRHP");
    expect(rows).toEqual([{ company: "JAGATJIT AGRI ENGINEERING LIMITED", date: "2026-10-01", page: "https://sebi/x-drhp_1.html" }]);
  });
  it("reads subscription multiples by NSE category order", () => {
    expect(subscriptionFrom([{ srNo: "1", noOfTotalMeant: "0.95" }, { srNo: "2", noOfTotalMeant: "0.80" }, { srNo: "3", noOfTotalMeant: "0.47" }, { category: "Total", srNo: null, noOfTotalMeant: "0.57" }])).toEqual({ qibX: 0.95, niiX: 0.8, riiX: 0.47, totalX: 0.57 });
  });
  it("reads BRLMs and lot size from NSE issue info", () => {
    expect(detailFrom([{ title: "Book Running Lead Managers", value: "Saffron Capital Advisors Private Limited" }, { title: "Bid Lot", value: "68 Equity Shares and in multiples thereof" }])).toEqual({ brlms: ["Saffron Capital Advisors Private Limited"], lotSize: 68 });
  });
});
