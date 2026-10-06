import { describe, expect, it } from "vitest";
import { parseResultsXbrl, periodKind } from "../xbrl";

describe("XBRL Parser", () => {
  it("computes period kind accurately based on duration days", () => {
    expect(periodKind("2024-04-01", "2024-06-30")).toBe("quarter");
    expect(periodKind("2024-04-01", "2024-09-30")).toBe("ytd");
    expect(periodKind("2024-04-01", "2025-03-31")).toBe("annual");
  });

  it("parses minimal Ind-AS XBRL XML into structured statements", () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:in-bse-fin="http://www.bseindia.com/xbrl/fin/2020-03-31/in-bse-fin">
  <xbrli:context id="Duration_Q1">
    <xbrli:entity><xbrli:identifier scheme="http://www.bseindia.com">500209</xbrli:identifier></xbrli:entity>
    <xbrli:period>
      <xbrli:startDate>2024-04-01</xbrli:startDate>
      <xbrli:endDate>2024-06-30</xbrli:endDate>
    </xbrli:period>
  </xbrli:context>
  <xbrli:context id="Instant_Q1">
    <xbrli:entity><xbrli:identifier scheme="http://www.bseindia.com">500209</xbrli:identifier></xbrli:entity>
    <xbrli:period>
      <xbrli:instant>2024-06-30</xbrli:instant>
    </xbrli:period>
  </xbrli:context>
  <in-bse-fin:NatureOfReportStandaloneConsolidated contextRef="Duration_Q1">Consolidated</in-bse-fin:NatureOfReportStandaloneConsolidated>
  <in-bse-fin:WhetherResultsAreAuditedOrUnaudited contextRef="Duration_Q1">Unaudited</in-bse-fin:WhetherResultsAreAuditedOrUnaudited>
  <in-bse-fin:RevenueFromOperations contextRef="Duration_Q1" unitRef="INR" decimals="-7">626130000000</in-bse-fin:RevenueFromOperations>
  <in-bse-fin:ProfitLossForPeriod contextRef="Duration_Q1" unitRef="INR" decimals="-7">120400000000</in-bse-fin:ProfitLossForPeriod>
  <in-bse-fin:Assets contextRef="Instant_Q1" unitRef="INR" decimals="-7">1450000000000</in-bse-fin:Assets>
</xbrli:xbrl>`;

    const res = parseResultsXbrl(xml);
    expect(res).not.toBeNull();
    if (!res) return;

    expect(res.basis).toBe("consolidated");
    expect(res.audited).toBe(false);
    expect(res.periods.length).toBe(1);

    const q1 = res.periods[0];
    expect(q1.kind).toBe("quarter");
    expect(q1.start).toBe("2024-04-01");
    expect(q1.end).toBe("2024-06-30");
    // Values scaled to INR Crore (62613 Cr)
    expect(q1.pl.RevenueFromOperations).toBe(62613);
    expect(q1.pl.ProfitLossForPeriod).toBe(12040);
    expect(q1.bs?.Assets).toBe(145000);
  });

  it("handles modern in-capmkt prefixes and deduplicates dimensional tags", () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:in-capmkt="http://www.nseindia.com/xbrl/fin/2024-01-01/in-capmkt">
  <xbrli:context id="Main_FY">
    <xbrli:period>
      <xbrli:startDate>2024-04-01</xbrli:startDate>
      <xbrli:endDate>2025-03-31</xbrli:endDate>
    </xbrli:period>
  </xbrli:context>
  <!-- Dimensional context: should be skipped from entity total -->
  <xbrli:context id="Segment_Banking">
    <xbrli:period>
      <xbrli:startDate>2024-04-01</xbrli:startDate>
      <xbrli:endDate>2025-03-31</xbrli:endDate>
    </xbrli:period>
    <xbrli:scenario>
      <xbrli:explicitMember dimension="SegmentAxis">BankingSegment</xbrli:explicitMember>
    </xbrli:scenario>
  </xbrli:context>
  <in-capmkt:NatureOfReportStandaloneConsolidated contextRef="Main_FY">Standalone</in-capmkt:NatureOfReportStandaloneConsolidated>
  <in-capmkt:WhetherResultsAreAuditedOrUnaudited contextRef="Main_FY">Audited</in-capmkt:WhetherResultsAreAuditedOrUnaudited>
  <in-capmkt:RevenueFromOperations contextRef="Main_FY" decimals="-7">250000000000</in-capmkt:RevenueFromOperations>
  <in-capmkt:RevenueFromOperations contextRef="Segment_Banking" decimals="-7">999999999999</in-capmkt:RevenueFromOperations>
</xbrli:xbrl>`;

    const res = parseResultsXbrl(xml);
    expect(res).not.toBeNull();
    if (!res) return;

    expect(res.basis).toBe("standalone");
    expect(res.audited).toBe(true);
    expect(res.periods[0].kind).toBe("annual");
    // Should capture the entity total (25000 Cr), NOT the segment total (99999.9 Cr)
    expect(res.periods[0].pl.RevenueFromOperations).toBe(25000);
  });
});
