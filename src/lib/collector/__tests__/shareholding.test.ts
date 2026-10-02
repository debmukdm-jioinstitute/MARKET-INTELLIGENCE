import { describe, expect, it } from "vitest";
import { masterToRows, parseNseDay, parseShpXbrl } from "@/lib/collector/shareholding";

const fact = (name: string, ctx: string, v: string) => `<in-bse-shp:${name} contextRef="${ctx}" decimals="4">${v}</in-bse-shp:${name}>`;
const P = "ShareholdingOfPromoterAndPromoterGroup_ContextI";
const xml = (extra = "") =>
  [
    fact("DateOfReport", "MainI", "2026-06-30"),
    fact("ShareholdingAsAPercentageOfTotalNumberOfShares", P, "0.7197"),
    fact("ShareholdingAsAPercentageOfTotalNumberOfShares", "InstitutionsForeign_ContextI", "0.1052"),
    fact("ShareholdingAsAPercentageOfTotalNumberOfShares", "InstitutionsDomestic_ContextI", "0.1075"),
    fact("ShareholdingAsAPercentageOfTotalNumberOfShares", "PublicShareholding_ContextI", "0.2803"),
    fact("NumberOfShareholders", "ShareholdingPattern_ContextI", "588595"),
    extra,
  ].join("");

describe("parseShpXbrl", () => {
  it("reads category percentages, count and quarter end", () => {
    const d = parseShpXbrl(xml(fact("EncumberedSharesHeldAsPercentageOfTotalNumberOfShares", P, "0.0079")));
    expect(d).toMatchObject({ quarterEnd: "2026-06-30", promoterPct: 71.97, fiiPct: 10.52, diiPct: 10.75, publicPct: 28.03, pledgePct: 0.79, shareholderCount: 588595 });
  });
  it("calls pledge 0 only when the filing says nothing is encumbered, else leaves it unknown", () => {
    const none = ["Pledged", "NonDisposalUndertaking", "OtherThanByWayOfPledgeOrNDU"].map((k) => fact(`WhetherAnySharesHeldByPromotersAreEncumbered${k === "OtherThanByWayOfPledgeOrNDU" ? k : "Under" + k}`, "MainI", "false")).join("");
    expect(parseShpXbrl(xml(none)).pledgePct).toBe(0);
    expect(parseShpXbrl(xml()).pledgePct).toBeNull();
  });
  it("returns nulls for an empty document", () => {
    expect(parseShpXbrl("<x/>")).toMatchObject({ promoterPct: null, fiiPct: null, pledgePct: null, shareholderCount: null });
  });
});

describe("master rows", () => {
  it("parses NSE dates and keeps the broadcast date as the event date", () => {
    expect(parseNseDay("16-JUL-2026 19:24:44")).toBe("2026-07-16");
    expect(parseNseDay("garbage")).toBeNull();
    const rows = masterToRows("RELIANCE", [
      { broadcastDate: "21-APR-2026 13:25:14", date: "31-MAR-2026", pr_and_prgrp: "50", public_val: "50", xbrl: "https://x/a.xml" },
      { broadcastDate: "16-JUL-2026 19:24:44", date: "30-JUN-2026", pr_and_prgrp: "50.48", public_val: "49.52", xbrl: null },
      { broadcastDate: null, date: "30-JUN-2026", pr_and_prgrp: "1", public_val: "2" },
    ]);
    expect(rows.map((r) => r.broadcastDate)).toEqual(["2026-07-16", "2026-04-21"]); // newest first, undated dropped
    expect(rows[0]).toMatchObject({ promoterPct: 50.48, publicPct: 49.52, quarterEnd: "2026-06-30", xbrlUrl: null });
  });
});
