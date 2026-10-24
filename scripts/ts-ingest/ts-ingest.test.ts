import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { nseFiidii, nseParticipantOi, nseBhavcopy, fredObs, nsdlFpi, nsdlDepo, cdslBo, nseShareholding } from "./parsers";
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

import { nseIndexHistory, amfiNav, amfiMonthly, amfiSip, mospi, rbiWss, rbiDbie } from "./parsers";
import { SOURCES } from "./sources";
describe("indexhistory + registry of sources", () => {
  it("parses both timestamp styles", () => {
    const j = JSON.stringify({ data: { indexCloseOnlineRecords: [
      { EOD_CLOSE_INDEX_VAL: 25000.5, EOD_TIMESTAMP: "23-Oct-2026" },
      { EOD_CLOSE_INDEX_VAL: "24,900", TIMESTAMP: "2026-10-22T00:00:00.000Z" },
      { EOD_CLOSE_INDEX_VAL: "-", EOD_TIMESTAMP: "21-Oct-2026" },
    ] } });
    const [s] = nseIndexHistory(Buffer.from(j), { url: "u", meta: { slug: "nifty50" } });
    expect(s.id).toBe("ts_niftyidx_nifty50_px");
    expect(s.obs).toEqual([{ date: "2026-10-23", value: 25000.5 }, { date: "2026-10-22", value: 24900 }]);
  });
  it("formats ind_close_all URL for candidate dates", () => {
    const src = SOURCES.find((x) => x.id === "nse_indexhistory")!;
    expect(src.perDate).toBe(true);
    expect(src.urls("2026-10-23")[0]).toBe("https://nsearchives.nseindia.com/content/indices/ind_close_all_23102026.csv");
  });
  it("parses ind_close_all.csv for tracked indices and valuation", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/ind_close_all.csv");
    const r = nseIndexHistory(buf, ctx);
    const px = r.filter((s) => s.id.endsWith("_px"));
    expect(px.map((s) => s.id).sort()).toEqual([
      "ts_niftyidx_nifty500_px",
      "ts_niftyidx_nifty50_px",
      "ts_niftyidx_niftybank_px",
      "ts_niftyidx_niftyit_px",
      "ts_niftyidx_niftymidcap150_px",
      "ts_niftyidx_niftysmallcap250_px",
    ]);
    expect(r.find((s) => s.id === "ts_niftyidx_nifty50_px")!.obs[0]).toEqual({ date: "2026-10-23", value: 22600 });
    expect(r.find((s) => s.id === "ts_niftyidx_nifty50_pe")!.obs[0]).toEqual({ date: "2026-10-23", value: 19.05 });
  });
  it("disabled sources are not scheduled", () => {
    expect(SOURCES.some((x) => x.id.startsWith("niftyindices") || x.id === "oecd")).toBe(false);
  });
});

describe("amfi parsers", () => {
  it("amfiNav parses tracked ETFs and index funds", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/amfi_nav_sample.txt");
    const r = amfiNav(buf, ctx);
    expect(r.length).toBeGreaterThan(0);
    const niftybees = r.find((s) => s.id === "ts_etf_niftybees_nav");
    expect(niftybees).toBeDefined();
    expect(niftybees!.obs[0].value).toBeGreaterThan(0);
    expect(niftybees!.unit).toBe("₹");
  });

  it("amfiMonthly parses category AUM, flows and NFOs", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/amfi_monthly_sample.xls");
    const r = amfiMonthly(buf, ctx);
    const aumTotal = r.find((s) => s.id === "ts_amfi_aum_total");
    const aumEquity = r.find((s) => s.id === "ts_amfi_aum_equity");
    const nfo = r.find((s) => s.id === "ts_amfi_nfo_mobilized");
    expect(aumTotal).toBeDefined();
    expect(aumTotal!.obs[0].value).toBeGreaterThan(8000000); // > 80 lakh cr
    expect(aumEquity).toBeDefined();
    expect(aumEquity!.obs[0].value).toBeGreaterThan(3000000); // > 30 lakh cr
    expect(nfo).toBeDefined();
    expect(nfo!.obs[0].value).toBe(2708);
  });

  it("amfiSip parses monthly SIP contributions and stoppage ratio", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/amfi_sip_sample.html");
    const r = amfiSip(buf, ctx);
    const sipInflow = r.find((s) => s.id === "ts_amfi_sip_inflow");
    const stoppage = r.find((s) => s.id === "ts_amfi_sip_stoppage");
    expect(sipInflow).toBeDefined();
    expect(sipInflow!.obs[0].value).toBe(32490);
    expect(stoppage).toBeDefined();
    expect(stoppage!.obs[0].value).toBe(78.5);
  });
});

describe("mospi parser", () => {
  it("mospi parses CPI headline, core, and contributions", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/mospi_cpi_sample.json");
    const r = mospi(buf, { url: "https://api.mospi.gov.in/api/cpi/getCPIIndex", date: "2025-12-01" });
    const cpi = r.find((s) => s.id === "ts_mospi_cpi_yoy");
    const core = r.find((s) => s.id === "ts_mospi_core_cpi");
    const food = r.find((s) => s.id === "ts_mospi_cpi_food_contrib");
    expect(cpi).toBeDefined();
    expect(cpi!.obs.length).toBeGreaterThan(0);
    expect(core).toBeDefined();
    expect(core!.obs.length).toBeGreaterThan(0);
    expect(food).toBeDefined();
    expect(food!.obs.length).toBeGreaterThan(0);
  });

  it("mospi parses WPI wholesale price inflation", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/mospi_wpi_sample.json");
    const r = mospi(buf, { url: "https://api.mospi.gov.in/api/wpi/getWpiRecords", date: "2026-04-01" });
    const wpi = r.find((s) => s.id === "ts_mospi_wpi");
    expect(wpi).toBeDefined();
    expect(wpi!.obs.length).toBeGreaterThan(0);
    expect(wpi!.unit).toBe("%");
  });

  it("mospi parses IIP industrial production growth", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/mospi_iip_sample.json");
    const r = mospi(buf, { url: "https://api.mospi.gov.in/api/iip/getIipData", date: "2026-03-01" });
    const iip = r.find((s) => s.id === "ts_mospi_iip");
    expect(iip).toBeDefined();
    expect(iip!.obs.length).toBe(10);
    expect(iip!.obs[iip!.obs.length - 1].value).toBe(4.1);
  });

  it("mospi parses NAS real GDP growth", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/mospi_gdp_sample.json");
    const r = mospi(buf, { url: "https://api.mospi.gov.in/api/nas/getNASData", date: "2025-06-01" });
    const gdp = r.find((s) => s.id === "ts_mospi_gdp_real");
    expect(gdp).toBeDefined();
    expect(gdp!.obs.length).toBe(10);
    expect(gdp!.obs.find((o) => o.date === "2025-06-01")?.value).toBe(7.8);
  });

  it("mospi parses PLFS urban unemployment rate", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/mospi_plfs_sample.json");
    const r = mospi(buf, { url: "https://api.mospi.gov.in/api/plfs/getData", date: "2018-06-01" });
    const plfs = r.find((s) => s.id === "ts_mospi_plfs_ur");
    expect(plfs).toBeDefined();
    expect(plfs!.obs.length).toBeGreaterThan(0);
    expect(plfs!.unit).toBe("%");
  });
});

describe("rbi parsers", () => {
  it("rbiWss parses policy rates from home page", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/rbi_home_sample.html");
    const r = rbiWss(buf, { url: "https://www.rbi.org.in/", date: "2026-10-24" });
    const repo = r.find((s) => s.id === "ts_rbi_repo");
    const crr = r.find((s) => s.id === "ts_rbi_crr");
    const slr = r.find((s) => s.id === "ts_rbi_slr");
    expect(repo).toBeDefined();
    expect(repo!.obs[0].value).toBe(5.5);
    expect(crr).toBeDefined();
    expect(crr!.obs[0].value).toBe(3.0);
    expect(slr).toBeDefined();
    expect(slr!.obs[0].value).toBe(18.0);
  });

  it("rbiWss parses call money rate and net liquidity from MMO", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/rbi_mmo_sample.html");
    const r = rbiWss(buf, { url: "https://www.rbi.org.in/Scripts/BS_ViewMMO.aspx", date: "2026-10-24" });
    const call = r.find((s) => s.id === "ts_rbi_call_rate");
    const laf = r.find((s) => s.id === "ts_rbi_laf_net");
    expect(call).toBeDefined();
    expect(call!.obs[0].value).toBe(5.69);
    expect(laf).toBeDefined();
    expect(laf!.obs[0].value).toBe(-31254.95);
  });

  it("rbiDbie parses sectoral credit growth and categories", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/rbi_sectoral_sample.html");
    const r = rbiDbie(buf, { url: "https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=63697", date: "2026-08-31" });
    const nonFood = r.find((s) => s.id === "ts_rbi_credit_growth");
    const services = r.find((s) => s.id === "ts_rbi_credit_services");
    expect(nonFood).toBeDefined();
    expect(nonFood!.obs[0].value).toBe(18.8);
    expect(services).toBeDefined();
    expect(services!.obs[0].value).toBe(24.3);
  });

  it("rbiDbie parses WALR lending and term deposit rates", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/rbi_walr_sample.html");
    const r = rbiDbie(buf, { url: "https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=63702", date: "2026-09-30" });
    const walrOut = r.find((s) => s.id === "ts_rbi_walr_outstanding");
    const walrFresh = r.find((s) => s.id === "ts_rbi_walr_fresh");
    const deposit = r.find((s) => s.id === "ts_rbi_deposit_growth");
    expect(walrOut).toBeDefined();
    expect(walrOut!.obs[0].value).toBe(8.96);
    expect(walrFresh).toBeDefined();
    expect(walrFresh!.obs[0].value).toBe(8.61);
    expect(deposit).toBeDefined();
    expect(deposit!.obs[0].value).toBe(6.56);
  });

  it("rbiDbie parses MPC votes from minutes", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/rbi_mpc_sample.html");
    const r = rbiDbie(buf, { url: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=63839", date: "2026-10-21" });
    const mpc = r.find((s) => s.id === "ts_rbi_mpc_votes");
    expect(mpc).toBeDefined();
    expect(mpc!.obs[0].value).toBe(6.0);
  });
});


describe("flows and ownership parsers", () => {
  it("nsdlFpi parses monthly net equity and debt flows", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/nsdl_fpi_monthly_sample.html");
    const r = nsdlFpi(buf, { url: "https://www.fpi.nsdl.co.in/web/Reports/Monthly.aspx", date: "2026-10-23" });
    const eq = r.find((s) => s.id === "ts_nsdl_fpi_net_equity_m");
    const debt = r.find((s) => s.id === "ts_nsdl_fpi_net_debt_m");
    expect(eq).toBeDefined();
    expect(eq!.obs[0].value).toBe(-48056.33);
    expect(debt).toBeDefined();
    expect(debt!.obs[0].value).toBe(-1452.68);
  });

  it("nsdlFpi parses fortnightly sector equity AUC", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/nsdl_fpi_sector_sample.html");
    const r = nsdlFpi(buf, { url: "https://www.fpi.nsdl.co.in/web/StaticReports/Fortnightly_Sector_wise_FII_Investment_Data/FIIInvestSector_Oct152026.html", date: "2026-10-15" });
    const fin = r.find((s) => s.id === "ts_nsdl_fpi_sector_fin");
    const itSec = r.find((s) => s.id === "ts_nsdl_fpi_sector_it");
    const auto = r.find((s) => s.id === "ts_nsdl_fpi_sector_auto");
    expect(fin).toBeDefined();
    expect(fin!.obs[0].value).toBe(2001020);
    expect(itSec).toBeDefined();
    expect(itSec!.obs[0].value).toBe(358900);
    expect(auto).toBeDefined();
    expect(auto!.obs[0].value).toBe(498295);
  });

  it("nsdlDepo parses active client accounts and custody value", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/nsdl_stats_sample.html");
    const r = nsdlDepo(buf, { url: "https://nsdl.com/about-us/statistics", date: "2026-10-24" });
    const active = r.find((s) => s.id === "ts_nsdl_client_accounts");
    const custody = r.find((s) => s.id === "ts_nsdl_custody_val");
    expect(active).toBeDefined();
    expect(active!.obs[0].value).toBe(47183877);
    expect(custody).toBeDefined();
    expect(custody!.obs[0].value).toBe(536.45);
  });

  it("cdslBo parses active BO accounts and total demat accounts", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/cdsl_update_sample.js");
    const r = cdslBo(buf, { url: "https://www.cdslindia.com/IncludesNew/js/Home/cdslupdate.js", date: "2026-09-30" });
    const bo = r.find((s) => s.id === "ts_cdsl_bo_accounts");
    const total = r.find((s) => s.id === "ts_depo_total_accounts");
    expect(bo).toBeDefined();
    expect(bo!.obs[0].value).toBe(193406915);
    expect(total).toBeDefined();
    expect(total!.obs[0].value).toBe(240590792);
  });

  it("nseShareholding parses market ownership distribution", () => {
    const buf = readFileSync("scripts/ts-ingest/__fixtures__/shareholding_sample.xml");
    const r = nseShareholding(buf, { url: "https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol=RELIANCE", date: "2026-09-30" });
    const prom = r.find((s) => s.id === "ts_ownership_promoter");
    const fii = r.find((s) => s.id === "ts_ownership_fii");
    const dii = r.find((s) => s.id === "ts_ownership_dii");
    const mf = r.find((s) => s.id === "ts_ownership_mf");
    const pub = r.find((s) => s.id === "ts_ownership_retail");
    expect(prom!.obs[0].value).toBe(50.48);
    expect(fii!.obs[0].value).toBe(19.25);
    expect(dii!.obs[0].value).toBe(16.1);
    expect(mf!.obs[0].value).toBe(9.65);
    expect(pub!.obs[0].value).toBe(14.17);
  });
});
