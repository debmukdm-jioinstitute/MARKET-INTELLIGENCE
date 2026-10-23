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
