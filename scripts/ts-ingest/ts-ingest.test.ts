import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { nseFiidii, nseParticipantOi, nseBhavcopy, fredObs } from "./parsers";
import { candidateDates, parseDmy } from "./dates";

const ctx = { url: "https://x/y", date: "2026-10-23" };

describe("dates", () => {
  it("parses DD-Mon-YYYY and DD-MM-YYYY", () => {
    expect(parseDmy("23-Oct-2026")).toBe("2026-10-23");
    expect(parseDmy("03-01-2026")).toBe("2026-01-03");
    expect(parseDmy("garbage")).toBeNull();
  });
  it("candidateDates skips weekends and starts after latest", () => {
    // 2026-10-23 is a Friday
    expect(candidateDates("2026-10-22", "2026-10-26")).toEqual(["2026-10-23", "2026-10-26"]);
    expect(candidateDates("2026-10-23", "2026-10-23")).toEqual([]);
  });
});

describe("parsers", () => {
  it("fiidii json", () => {
    const j = JSON.stringify([
      { category: "DII", date: "23-Oct-2026", buyValue: "1", sellValue: "1", netValue: "1,234.50" },
      { category: "FII/FPI", date: "23-Oct-2026", buyValue: "1", sellValue: "1", netValue: "-2,000.10" },
    ]);
    const r = nseFiidii(Buffer.from(j), ctx);
    expect(r.find((s) => s.id === "ts_flows_fii_net")!.obs[0]).toEqual({ date: "2026-10-23", value: -2000.1 });
    expect(r.find((s) => s.id === "ts_flows_dii_net")!.obs[0].value).toBe(1234.5);
  });
  it("participant OI csv (title row, BOM, trailing spaces)", () => {
    const csv = "﻿Future Index Long,x\nClient Type,Future Index Long,Future Index Short,Option Index Call Long\nClient,100,40,1\nFII,50,80,1\nTOTAL,150,120,2\n";
    const r = nseParticipantOi(Buffer.from(csv), ctx);
    expect(r.map((s) => [s.id, s.obs[0].value])).toEqual([["ts_fno_client_index_fut_net", 60], ["ts_fno_fii_index_fut_net", -30]]);
  });
  it("bhavcopy zip counts advances/declines on EQ series only", () => {
    const csv = "TckrSymb,SctySrs,ClsPric,PrvsClsgPric,TtlTrfVal\nA,EQ,11,10,10000000\nB,EQ,9,10,20000000\nC,BE,10,10,0\nD,N1,50,40,1\nE,EQ,-,10,5\n";
    const zip = Buffer.from(zipSync({ "sub/x.csv": strToU8(csv) }));
    const r = Object.fromEntries(nseBhavcopy(zip, ctx).map((s) => [s.id, s.obs[0].value]));
    expect(r).toMatchObject({ ts_breadth_advances: 1, ts_breadth_declines: 1, ts_breadth_unchanged: 1, ts_cash_traded_value: 3 });
  });
  it("fred skips '.' and masks key", () => {
    const j = JSON.stringify({ observations: [{ date: "2026-10-20", value: "4.1" }, { date: "2026-10-21", value: "." }] });
    const [s] = fredObs(Buffer.from(j), { url: "https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=SECRET&file_type=json" });
    expect(s.id).toBe("ts_fred_dgs10");
    expect(s.obs).toEqual([{ date: "2026-10-20", value: 4.1 }]);
    expect(s.url).not.toContain("SECRET");
  });
});

import { niftyIndices, ecbEurInr, bisPolicy, oecdCli } from "./parsers";
describe("more parsers", () => {
  it("niftyindices TRI + PE/PB (json-in-string)", () => {
    const tri = JSON.stringify({ d: JSON.stringify([{ Date: "23 Oct 2026", TotalReturnsIndex: "30,123.45" }, { Date: "22 Oct 2026", TotalReturnsIndex: "-" }]) });
    const [s] = niftyIndices(Buffer.from(tri), { url: "u", meta: { slug: "nifty50", kind: "tri" } });
    expect(s.id).toBe("ts_niftyidx_nifty50_tri");
    expect(s.obs).toEqual([{ date: "2026-10-23", value: 30123.45 }]);
    const pe = JSON.stringify({ d: JSON.stringify([{ DATE: "23 Oct 2026", pe: "22.4", pb: "3.5", divYield: "1.2" }]) });
    expect(niftyIndices(Buffer.from(pe), { url: "u", meta: { slug: "nifty50", kind: "pepb" } }).map((x) => [x.id, x.obs[0].value])).toEqual([["ts_niftyidx_nifty50_pe", 22.4], ["ts_niftyidx_nifty50_pb", 3.5]]);
  });
  it("ecb csv", () => {
    const [s] = ecbEurInr(Buffer.from("KEY,TIME_PERIOD,OBS_VALUE\nEXR.D,2026-10-22,97.5\nEXR.D,2026-10-23,\n"), { url: "u" });
    expect(s.obs).toEqual([{ date: "2026-10-22", value: 97.5 }]);
  });
  it("bis + oecd split by area", () => {
    const b = bisPolicy(Buffer.from("REF_AREA,TIME_PERIOD,OBS_VALUE\nIN,2026-10,5.5\nXM,2026-10,2\n"), { url: "u" });
    expect(b.map((s) => s.id).sort()).toEqual(["ts_bis_policy_ea", "ts_bis_policy_in"]);
    const o = oecdCli(Buffer.from("REF_AREA,TIME_PERIOD,OBS_VALUE\nIND,2026-09,100.4\nUSA,2026-09,99\n"), { url: "u" });
    expect(o.map((s) => s.id).sort()).toEqual(["ts_oecd_cli_ind", "ts_oecd_cli_usa"]);
    expect(o[0].obs[0].date).toBe("2026-09-01");
  });
});

import { nseHolidays, nseCorpActions, worldBank } from "./parsers";
describe("events + worldbank", () => {
  it("holidays", () => {
    const j = JSON.stringify({ CM: [{ tradingDate: "26-Jan-2027", description: "Republic Day" }, { tradingDate: "bad" }] });
    expect(nseHolidays(Buffer.from(j), ctx)).toEqual([{ id: "holiday:2027-01-26", kind: "holiday", symbol: null, title: "Republic Day", event_date: "2027-01-26" }]);
  });
  it("corporate actions kinds", () => {
    const j = JSON.stringify([
      { symbol: "ABC", subject: "Dividend - Rs 5 Per Share", exDate: "30-Oct-2026", recDate: "31-Oct-2026", comp: "ABC Ltd" },
      { symbol: "XYZ", subject: "Face Value Split (Sub-Division) - From Rs 10/- To Rs 2/-", exDate: "02-Nov-2026" },
      { symbol: "NOPE", subject: "x", exDate: "garbage" },
    ]);
    const r = nseCorpActions(Buffer.from(j), ctx);
    expect(r.map((e) => [e.symbol, e.kind, e.event_date])).toEqual([["ABC", "dividend", "2026-10-30"], ["XYZ", "split", "2026-11-02"]]);
  });
  it("world bank by country", () => {
    const j = JSON.stringify([{ page: 1 }, [{ countryiso3code: "IND", date: "2024", value: 6.5 }, { countryiso3code: "IND", date: "2023", value: 8.2 }, { countryiso3code: "USA", date: "2024", value: null }]]);
    const r = worldBank(Buffer.from(j), { url: "https://api.worldbank.org/v2/country/IND;USA/indicator/NY.GDP.MKTP.KD.ZG?format=json" });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("ts_wb_gdp_growth_ind");
    expect(r[0].obs.map((o) => o.date)).toEqual(["2023-12-31", "2024-12-31"]);
  });
});

import { looksLikeHtml, bodyHead } from "./http";
describe("html sniffing", () => {
  it("detects soft-404 pages, not data", () => {
    expect(looksLikeHtml(Buffer.from("  <!DOCTYPE html><html>..."))).toBe(true);
    expect(looksLikeHtml(Buffer.from("<html lang=en>"))).toBe(true);
    expect(looksLikeHtml(Buffer.from("Client Type,Future Index Long"))).toBe(false);
    expect(looksLikeHtml(Buffer.from([0x50, 0x4b, 3, 4]))).toBe(false);
    expect(looksLikeHtml(Buffer.from('{"d":"[]"}'))).toBe(false);
  });
  it("bodyHead collapses whitespace", () => expect(bodyHead(Buffer.from("a\n  b\tc"), 20)).toBe("a b c"));
});

import { nseAllIndices } from "./parsers";
describe("allIndices", () => {
  it("extracts tracked index P/E and P/B at the snapshot date", () => {
    const j = JSON.stringify({ timestamp: "23-Oct-2026 15:30:00", data: [
      { index: "NIFTY 50", pe: "22.41", pb: "3.52" },
      { index: "NIFTY BANK", pe: "-", pb: "2.4" },
      { index: "NIFTY AUTO", pe: "30", pb: "5" },
    ] });
    const r = nseAllIndices(Buffer.from(j), ctx);
    expect(r.map((s) => [s.id, s.obs[0].date, s.obs[0].value])).toEqual([
      ["ts_niftyidx_nifty50_pe", "2026-10-23", 22.41], ["ts_niftyidx_nifty50_pb", "2026-10-23", 3.52], ["ts_niftyidx_niftybank_pb", "2026-10-23", 2.4],
    ]);
  });
  it("fails loudly without a timestamp", () => expect(() => nseAllIndices(Buffer.from('{"data":[]}'), ctx)).toThrow());
});
