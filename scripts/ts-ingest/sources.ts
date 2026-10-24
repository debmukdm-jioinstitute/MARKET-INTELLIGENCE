import { addDays, fmtDmy, fmtYmd } from "./dates";
import type { EventParserName, ParserName } from "./parsers";

export type Req = { /** Tried when the primary request returns an HTML page. */ alt?: Req; url: string; method?: "GET" | "POST"; body?: string; headers?: Record<string, string>; meta?: Record<string, string> };
export type ReqCtx = { date?: string; latest: string | null; today: string; since?: string };

export type SourceCfg = {
  id: string;
  /** Preferred over `urls` when set: full request specs (POST bodies, per-index metadata). */
  reqs?: (c: ReqCtx) => Req[];
  /** One request per candidate date (daily-by-date archives) or a single url for snapshot APIs. */
  urls: (d?: string) => string[];
  perDate: boolean;
  fmt: "csv" | "zip-csv" | "json" | "text" | "binary" | "html";
  freq: "daily" | "weekly" | "monthly";
  /** Dataset staleness tolerance in days before state flips current → behind. */
  lagDays: number;
  nseCookie?: boolean;
  /** Page to GET first for session cookies (ASP.NET sites). */
  warm?: string;
  /** Send a full browser User-Agent. */
  browser?: boolean;
  parser: ParserName | EventParserName;
  /** Parser yields calendar events (ts_events) instead of numeric series. */
  events?: boolean;
  dataset: string;
  /** Series whose max(obs_date) defines the dataset's latest_obs. */
  anchorSeries: string;
  needsEnv?: string;
};

const FRED_IDS = ["DGS10", "DFII10", "DTWEXBGS", "DEXINUS", "VIXCLS", "WALCL", "NFCI", "T10Y2Y", "DFF", "UNRATE", "CPIAUCSL", "DCOILBRENTEU", "BAMLH0A0HYM2"];
const fred = (id: string): SourceCfg => ({
  id: `fred_${id.toLowerCase()}`,
  urls: () => [`https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${process.env.FRED_API_KEY ?? ""}&file_type=json`],
  perDate: false, fmt: "json", freq: "daily", lagDays: 7, parser: "fredObs", dataset: "fred", anchorSeries: `ts_fred_${id.toLowerCase()}`, needsEnv: "FRED_API_KEY",
});

/** Source registry (CLAUDE_BUILD_SPEC §3 subset with verified parsers). Extend with new rows + parsers. */
export const SOURCES: SourceCfg[] = [
  {
    id: "nse_fiidii", urls: () => ["https://www.nseindia.com/api/fiidiiTradeReact"], perDate: false, fmt: "json", freq: "daily", lagDays: 4,
    nseCookie: true, parser: "nseFiidii", dataset: "nse_fiidii", anchorSeries: "ts_flows_fii_net",
  },
  {
    id: "nse_participant_oi", urls: (d) => [`https://nsearchives.nseindia.com/content/nsccl/fao_participant_oi_${fmtDmy(d!)}.csv`], perDate: true, fmt: "csv", freq: "daily", lagDays: 4,
    parser: "nseParticipantOi", dataset: "nse_participant_oi", anchorSeries: "ts_fno_fii_index_fut_net",
  },
  {
    id: "nse_bhavcopy", urls: (d) => [`https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${fmtYmd(d!)}_F_0000.csv.zip`], perDate: true, fmt: "zip-csv", freq: "daily", lagDays: 4,
    parser: "nseBhavcopy", dataset: "nse_bhavcopy", anchorSeries: "ts_breadth_advances",
  },
  ...FRED_IDS.map(fred),
];

const DMY_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const niftyDate = (iso: string) => `${iso.slice(8, 10)}-${DMY_MON[Number(iso.slice(5, 7)) - 1]}-${iso.slice(0, 4)}`;

/** niftyindices.com indices: [slug, display name as the backend expects]. */
export const NIFTY_INDICES: [string, string][] = [
  ["nifty50", "Nifty 50"],
  ["niftynext50", "Nifty Next 50"],
  ["nifty100", "Nifty 100"],
  ["nifty200", "Nifty 200"],
  ["nifty500", "Nifty 500"],
  ["niftymidcap50", "Nifty Midcap 50"],
  ["niftymidcap100", "NIFTY Midcap 100"],
  ["niftysmallcap100", "NIFTY Smallcap 100"],
  ["nifty50dividendpoints", "Nifty50 Dividend Points"],
  ["niftyauto", "Nifty Auto"],
  ["niftybank", "Nifty Bank"],
  ["niftyenergy", "Nifty Energy"],
  ["niftyfinancialservices", "Nifty Financial Services"],
  ["niftyfmcg", "Nifty FMCG"],
  ["niftyit", "Nifty IT"],
  ["niftymedia", "Nifty Media"],
  ["niftymetal", "Nifty Metal"],
  ["niftymnc", "Nifty MNC"],
  ["niftypharma", "Nifty Pharma"],
  ["niftypsubank", "Nifty PSU Bank"],
  ["niftyrealty", "Nifty Realty"],
  ["niftyindiaconsumption", "Nifty India Consumption"],
  ["niftycommodities", "Nifty Commodities"],
  ["niftydividendopportunities50", "Nifty Dividend Opportunities 50"],
  ["niftyinfrastructure", "Nifty Infrastructure"],
  ["niftypse", "Nifty PSE"],
  ["niftyservicessector", "Nifty Services Sector"],
  ["nifty50shariah", "Nifty50 Shariah"],
  ["nifty500shariah", "Nifty500 Shariah"],
  ["niftylowvolatility50", "Nifty Low Volatility 50"],
  ["niftyalpha50", "Nifty Alpha 50"],
  ["niftyhighbeta50", "Nifty High Beta 50"],
  ["nifty100equalweight", "Nifty100 Equal Weight"],
  ["nifty100liquid15", "Nifty100 Liquid 15"],
  ["niftycpse", "Nifty CPSE"],
  ["nifty50value20", "Nifty50 Value 20"],
  ["niftymidcapliquid15", "Nifty Midcap Liquid 15"],
  ["niftyshariah25", "Nifty Shariah 25"],
  ["indiavix", "India VIX"],
  ["niftygrowthsectors15", "Nifty Growth Sectors 15"],
  ["nifty50tr1xinverse", "Nifty50 TR 1x Inverse"],
  ["nifty50tr2xleverage", "Nifty50 TR 2x Leverage"],
  ["nifty50pr1xinverse", "Nifty50 PR 1x Inverse"],
  ["nifty50pr2xleverage", "Nifty50 PR 2x Leverage"],
  ["nifty100quality30", "NIFTY100 Quality 30"],
  ["niftyindiacorporategroupindexmahindragroup", "Nifty India Corporate Group Index - Mahindra Group"],
  ["niftyindiacorporategroupindexadityabirlagroup", "Nifty India Corporate Group Index - Aditya Birla Group"],
  ["niftyindiacorporategroupindextatagroup", "Nifty India Corporate Group Index - Tata Group"],
  ["niftyindiacorporategroupindextatagroup25cap", "Nifty India Corporate Group Index - Tata Group 25% Cap"],
  ["niftyprivatebank", "Nifty Private Bank"],
  ["niftysmallcap250", "Nifty Smallcap 250"],
  ["niftysmallcap50", "Nifty Smallcap 50"],
  ["niftymidcap150", "Nifty Midcap 150"],
  ["niftymidcapselect", "Nifty Midcap Select"],
  ["niftylargemidcap250", "NIFTY LargeMidcap 250"],
  ["niftysmeemerge", "NIFTY SME EMERGE"],
  ["niftyoilgas", "Nifty Oil & Gas"],
  ["niftyfinancialservices2550", "Nifty Financial Services 25/50"],
  ["niftyhealthcareindex", "Nifty Healthcare Index"],
  ["nifty500multicap502525", "Nifty500 Multicap 50:25:25"],
  ["niftymicrocap250", "Nifty Microcap 250"],
  ["niftytotalmarket", "Nifty Total Market"],
  ["niftyindiadigital", "Nifty India Digital"],
  ["niftymobility", "Nifty Mobility"],
  ["niftyindiadefence", "Nifty India Defence"],
  ["niftyfinancialservicesexbank", "Nifty Financial Services Ex-Bank"],
  ["niftyhousing", "Nifty Housing"],
  ["niftytransportationlogistics", "Nifty Transportation & Logistics"],
  ["niftymidsmallfinancialservices", "Nifty MidSmall Financial Services"],
  ["niftymidsmallhealthcare", "Nifty MidSmall Healthcare"],
  ["niftymidsmallittelecom", "Nifty MidSmall IT & Telecom"],
  ["niftymidsmallindiaconsumption", "Nifty MidSmall India Consumption"],
  ["niftyreitsinvits", "Nifty REITs & InvITs"],
  ["niftycorehousing", "Nifty Core Housing"],
  ["nifty500multicapinfrastructure503020", "Nifty500 Multicap Infrastructure 50:30:20"],
  ["niftyrural", "Nifty Rural"],
  ["niftycapitalmarkets", "Nifty Capital Markets"],
  ["niftyindianewageconsumption", "Nifty India New Age Consumption"],
  ["niftyindiaselect5corporategroupsmaatr", "Nifty India Select 5 Corporate Groups (MAATR)"],
  ["niftyindiarailwayspsu", "Nifty India Railways PSU"],
  ["niftyconsumerdurables", "Nifty Consumer Durables"],
  ["niftynoncyclicalconsumer", "Nifty Non-Cyclical Consumer"],
  ["nifty500multicapindiamanufacturing503020", "Nifty500 Multicap India Manufacturing 50:30:20"],
  ["niftyevnewageautomotive", "Nifty EV & New Age Automotive"],
  ["nifty500largemidsmallequalcapweighted", "Nifty500 LargeMidSmall Equal-Cap Weighted"],
  ["niftyindiatourism", "Nifty India Tourism"],
  ["niftymidsmallcap400", "Nifty MidSmallcap 400"],
  ["niftyipo", "Nifty IPO"],
  ["niftyindiainternet", "Nifty India Internet"],
  ["niftychemicals", "Nifty Chemicals"],
  ["niftyconglomerate50", "Nifty Conglomerate 50"],
  ["niftycommercialtransportservices", "Nifty Commercial & Transport Services"],
  ["niftynext100", "Nifty Next 100"],
  ["niftyindiainfrastructurelogistics", "Nifty India Infrastructure & Logistics"],
  ["niftyindiafpi150", "Nifty India FPI 150"],
  ["niftynbfc", "Nifty NBFC"],
  ["niftysmallfinancebanksmicrofinanceinstitutions", "Nifty Small Finance Banks & Microfinance Institutions"],
  ["niftywaves", "Nifty Waves"],
  ["niftysmallcap500", "Nifty Smallcap 500"],
  ["niftycement", "Nifty Cement"],
  ["niftyreitsrealty", "Nifty REITs & Realty"],
  ["niftyconstruction", "Nifty Construction"],
  ["niftyhospitals", "Nifty Hospitals"],
  ["niftyhousingfinance", "Nifty Housing Finance"],
  ["niftyinsurance", "Nifty Insurance"],
  ["niftypower", "Nifty Power"],
  ["niftyretail", "Nifty Retail"],
  ["nifty500healthcare", "Nifty500 Healthcare"],
  ["niftymidsmallcap4005050", "Nifty MidSmallcap400 50:50"],
  ["niftyconsumerservices", "Nifty Consumer Services"],
  ["niftycapitalgoods", "Nifty Capital Goods"],
  ["niftytelecommunications", "Nifty Telecommunications"],
  ["niftysugarethanol", "Nifty Sugar & Ethanol"],
  ["nifty500ahimsa", "Nifty500 Ahimsa"],
  ["niftyreitsinvits9010", "Nifty REITs & InvITs 90:10"],
  ["niftyaicatalysts", "Nifty AI Catalysts"],
  ["nifty500quality50", "Nifty500 Quality 50"],
  ["nifty500growth50", "Nifty500 Growth 50"],
  ["nifty100lowvolatility30", "Nifty100 Low Volatility 30"],
  ["niftyqualitylowvolatility30", "NIFTY Quality Low-Volatility 30"],
  ["niftyalphaqualitylowvolatility30", "NIFTY Alpha Quality Low-Volatility 30"],
  ["niftyalphaqualityvaluelowvolatility30", "NIFTY Alpha Quality Value Low-Volatility 30"],
  ["nifty200quality30", "NIFTY200 Quality 30"],
  ["niftymidcap150quality50", "NIFTY Midcap150 Quality 50"],
  ["nifty200momentum30", "Nifty200 Momentum 30"],
  ["niftyindiamanufacturing", "Nifty India Manufacturing"],
  ["nifty100esgsectorleaders", "Nifty100 ESG Sector Leaders"],
  ["nifty200alpha30", "Nifty200 Alpha 30"],
  ["niftymidcap150momentum50", "Nifty Midcap150 Momentum 50"],
  ["niftysmallcap250quality50", "Nifty Smallcap250 Quality 50"],
  ["niftysmallcap250momentumquality100", "Nifty Smallcap250 Momentum Quality 100"],
  ["niftymidsmallcap400momentumquality100", "Nifty MidSmallcap400 Momentum Quality 100"],
  ["nifty500momentum50", "Nifty500 Momentum 50"],
  ["nifty200value30", "Nifty200 Value 30"],
  ["niftytop10equalweight", "Nifty Top 10 Equal Weight"],
  ["nifty500multicapmomentumquality50", "Nifty500 Multicap Momentum Quality 50"],
  ["niftytop15equalweight", "Nifty Top 15 Equal Weight"],
  ["niftytop20equalweight", "Nifty Top 20 Equal Weight"],
  ["nifty500lowvolatility50", "Nifty500 Low Volatility 50"],
  ["nifty100esg", "NIFTY100 ESG"],
  ["nifty100enhancedesg", "NIFTY100 Enhanced ESG"],
  ["nifty500value50", "NIFTY500 Value 50"],
  ["nifty100alpha30", "NIFTY100 Alpha 30"],
  ["nifty500multifactormqvlv50", "Nifty500 Multifactor MQVLv 50"],
  ["niftyalphalowvolatility30", "NIFTY Alpha Low-Volatility 30"],
  ["nifty500flexicapquality30", "Nifty500 Flexicap Quality 30"],
  ["niftytotalmarketmomentumquality50", "Nifty Total Market Momentum Quality 50"],
  ["niftyhighdividendyield15", "Nifty High Dividend Yield 15"],
  ["nifty500equalweight", "Nifty500 Equal Weight"],
  ["nifty50equalweight", "NIFTY50 Equal Weight"],
  ["niftyindiadefenceequalweight", "Nifty India Defence Equal Weight"],
  ["nifty50futuresindex", "Nifty 50 Futures Index"],
  ["nifty50arbitrage", "Nifty 50 Arbitrage"],
  ["nifty50futurestrindex", "Nifty 50 Futures TR Index"],
  ["nifty813yrgsec", "Nifty 8-13 yr G-Sec"],
  ["nifty48yrgsecindex", "Nifty 4-8 yr G-Sec Index"],
  ["nifty1115yrgsecindex", "Nifty 11-15 yr G-Sec Index"],
  ["nifty15yrandabovegsecindex", "Nifty 15 yr and above G-Sec Index"],
  ["niftycompositegsecindex", "Nifty Composite G-sec Index"],
  ["nifty10yrbenchmarkgsec", "Nifty 10 yr Benchmark G-Sec"],
  ["nifty10yrbenchmarkgseccleanprice", "Nifty 10 yr Benchmark G-Sec (Clean Price)"],
  ["niftybharatbondindexapril2030", "Nifty BHARAT Bond Index - April 2030"],
  ["niftybharatbondindexapril2031", "Nifty BHARAT Bond Index - April 2031"],
  ["niftybharatbondindexapril2032", "Nifty BHARAT Bond Index - April 2032"],
  ["niftybharatbondindexapril2033", "Nifty BHARAT Bond Index - April 2033"],
  ["nifty1drateindex", "Nifty 1D Rate Index"],
  ["nifty50usd", "Nifty50 USD"],
];

const niftyHeaders = {
  "content-type": "application/json; charset=UTF-8",
  accept: "application/json, text/javascript, */*; q=0.01",
  origin: "https://www.niftyindices.com",
  referer: "https://www.niftyindices.com/reports/historical-data",
  "x-requested-with": "XMLHttpRequest",
};
/** The site's own pages send cinfo as a single-quoted pseudo-JSON string; standard JSON is kept as the alt. */
const niftyReq = (path: string, kind: "tri" | "pepb") => (c: ReqCtx): Req[] =>
  NIFTY_INDICES.map(([slug, name]) => {
    const f = { name, startDate: niftyDate(c.latest ? addDays(c.latest, 1) : "2005-01-01"), endDate: niftyDate(c.today), indexName: name };
    const url = `https://www.niftyindices.com/Backpage.aspx/${path}`;
    const single = `{'name':'${f.name}','startDate':'${f.startDate}','endDate':'${f.endDate}','indexName':'${f.indexName}'}`;
    const base = { url, method: "POST" as const, headers: niftyHeaders, meta: { slug, kind } };
    return { ...base, body: JSON.stringify({ cinfo: single }), alt: { ...base, body: JSON.stringify({ cinfo: JSON.stringify(f) }) } };
  });

SOURCES.push(
  {
    id: "ecb", urls: () => ["https://data-api.ecb.europa.eu/service/data/EXR/D.INR.EUR.SP00.A?format=csvdata&startPeriod=2000-01-01"], perDate: false, fmt: "csv", freq: "daily", lagDays: 6,
    parser: "ecbEurInr", dataset: "ecb", anchorSeries: "ts_ecb_eurinr",
  },
  {
    id: "bis", urls: () => ["IN", "US", "XM", "GB", "JP"].map((a) => `https://stats.bis.org/api/v1/data/WS_CBPOL/M.${a}?format=csv`), perDate: false, fmt: "csv", freq: "monthly", lagDays: 60,
    parser: "bisPolicy", dataset: "bis", anchorSeries: "ts_bis_policy_in",
  },
);

const WB_COUNTRIES = "IND;USA;CHN;JPN;DEU;GBR;BRA;IDN";
const wb = (ind: string) => `https://api.worldbank.org/v2/country/${WB_COUNTRIES}/indicator/${ind}?format=json&per_page=2000&date=1990:2030`;
SOURCES.push(
  {
    id: "worldbank", urls: () => [wb("NY.GDP.MKTP.KD.ZG"), wb("FP.CPI.TOTL.ZG")], perDate: false, fmt: "json", freq: "monthly", lagDays: 400,
    parser: "worldBank", dataset: "worldbank", anchorSeries: "ts_wb_gdp_growth_ind",
  },
  {
    id: "nse_holidays", urls: () => ["https://www.nseindia.com/api/holiday-master?type=trading"], perDate: false, fmt: "json", freq: "monthly", lagDays: 400,
    nseCookie: true, parser: "nseHolidays", events: true, dataset: "nse_holidays", anchorSeries: "events:holiday",
  },
  {
    id: "nse_corp_actions", urls: () => ["https://www.nseindia.com/api/corporates-corporateActions?index=equities"], perDate: false, fmt: "json", freq: "daily", lagDays: 45,
    nseCookie: true, parser: "nseCorpActions", events: true, dataset: "nse_corp_actions", anchorSeries: "events:action",
  },
);

/** NSE allIndices: current P/E, P/B, yield for every index. A daily snapshot, so history builds from first run (niftyindices backfills older). */
SOURCES.push({
  id: "nse_allindices", urls: () => ["https://www.nseindia.com/api/allIndices"], perDate: false, fmt: "json", freq: "daily", lagDays: 4,
  nseCookie: true, parser: "nseAllIndices", dataset: "nse_allindices", anchorSeries: "ts_niftyidx_nifty50_pe",
});

/**
 * Disabled, kept for reference (not run, not scheduled):
 * - niftyindices_*: after the site redesign the Backpage.aspx endpoints return the home page (HTTP 200, title "NIFTY Indices") from GitHub runners.
 * - oecd: sdmx.oecd.org answers HTTP 500 via Cloudflare to both request shapes from GitHub runners.
 * Re-enable by moving an entry into SOURCES once a working request shape is known.
 */
export const DISABLED_SOURCES: SourceCfg[] = [
  {
    id: "niftyindices_tri", urls: () => [], reqs: niftyReq("getTotalReturnIndexString", "tri"), perDate: false, fmt: "json", freq: "daily", lagDays: 4, warm: "https://www.niftyindices.com/reports/historical-data", browser: true,
    parser: "niftyIndices", dataset: "niftyindices", anchorSeries: "ts_niftyidx_nifty50_tri",
  },
  {
    id: "niftyindices_pepb", urls: () => [], reqs: niftyReq("getpepbHistoricaldataDBtoString", "pepb"), perDate: false, fmt: "json", freq: "daily", lagDays: 4, warm: "https://www.niftyindices.com/reports/historical-data", browser: true,
    parser: "niftyIndices", dataset: "niftyindices", anchorSeries: "ts_niftyidx_nifty50_pe",
  },
  {
    id: "oecd", urls: () => [],
    reqs: () => ["IND", "USA", "CHN", "DEU", "JPN", "GBR"].map((c): Req => {
      const base = `https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_CLI/${c}.M.LI...AA...H?startPeriod=2000-01`;
      return { url: `${base}&format=csvfile`, alt: { url: base, headers: { accept: "application/vnd.sdmx.data+csv; charset=utf-8; version=2" } } };
    }), perDate: false, fmt: "csv", freq: "monthly", lagDays: 75,
    parser: "oecdCli", dataset: "oecd", anchorSeries: "ts_oecd_cli_ind",
  },
];

/** NSE historical index closes via daily ind_close_all_{DDMMYYYY}.csv archives. */
SOURCES.push({
  id: "nse_indexhistory",
  urls: (d) => [`https://nsearchives.nseindia.com/content/indices/ind_close_all_${fmtDmy(d!)}.csv`],
  perDate: true,
  fmt: "csv",
  freq: "daily",
  lagDays: 4,
  parser: "nseIndexHistory",
  dataset: "nse_indexhistory",
  anchorSeries: "ts_niftyidx_nifty50_px",
});

/** AMFI NAVAll.txt: daily NAV snapshots for tracked ETFs and Index funds. */
SOURCES.push({
  id: "amfi_nav",
  urls: () => ["https://portal.amfiindia.com/spages/NAVAll.txt"],
  perDate: false,
  fmt: "text",
  freq: "daily",
  lagDays: 1,
  parser: "amfiNav",
  dataset: "amfi_nav",
  anchorSeries: "ts_etf_niftybees_nav",
});

/** AMFI monthly reports: industry AUM by category, net flows, and NFO collections. */
SOURCES.push({
  id: "amfi_monthly",
  urls: () => ["https://portal.amfiindia.com/spages/amsep2026repo.xls"],
  perDate: false,
  fmt: "binary",
  freq: "monthly",
  lagDays: 45,
  parser: "amfiMonthly",
  dataset: "amfi_monthly",
  anchorSeries: "ts_amfi_aum_total",
});

/** AMFI SIP trends: monthly SIP inflows and stoppage ratio. */
SOURCES.push({
  id: "amfi_sip",
  urls: () => ["https://www.amfiindia.com/mutual-fund"],
  perDate: false,
  fmt: "html",
  freq: "monthly",
  lagDays: 45,
  parser: "amfiSip",
  dataset: "amfi_sip",
  anchorSeries: "ts_amfi_sip_inflow",
});

/** MoSPI macro: CPI, WPI, IIP, GDP, and PLFS from official eSankhyiki APIs. */
SOURCES.push({
  id: "mospi",
  urls: () => ["https://api.mospi.gov.in/api/cpi/getCPIIndex?base_year=2012&series=Current&sector_code=3&state_code=99&limit=100"],
  reqs: () => [
    { url: "https://api.mospi.gov.in/api/cpi/getCPIIndex?base_year=2012&series=Current&sector_code=3&state_code=99&limit=100", meta: { kind: "cpi" } },
    { url: "https://api.mospi.gov.in/api/wpi/getWpiRecords?base_year=2011-12&major_group_code=1000000000&Format=JSON", meta: { kind: "wpi" } },
    { url: "https://api.mospi.gov.in/api/iip/getIipData?base_year=2011-12&frequency=Monthly&type=General&Format=JSON", meta: { kind: "iip" } },
    { url: "https://api.mospi.gov.in/api/nas/getNASData?base_year=2011-12&series=Current&frequency_code=Quarterly&indicator_code=22&Format=JSON", meta: { kind: "gdp" } },
    { url: "https://api.mospi.gov.in/api/plfs/getData?indicator_code=3&frequency_code=2&state_code=99&sector_code=2&gender_code=3&Format=JSON", meta: { kind: "plfs" } },
  ],
  perDate: false,
  fmt: "json",
  freq: "monthly",
  lagDays: 60,
  parser: "mospi",
  dataset: "mospi",
  anchorSeries: "ts_mospi_cpi_yoy",
});

/** RBI Weekly Statistical Supplement & Market Trends (Home rates widget + MMO). */
SOURCES.push({
  id: "rbi_wss",
  urls: () => ["https://www.rbi.org.in/"],
  reqs: () => [
    { url: "https://www.rbi.org.in/" },
    { url: "https://www.rbi.org.in/Scripts/BS_ViewMMO.aspx" },
  ],
  perDate: false,
  fmt: "html",
  freq: "weekly",
  lagDays: 7,
  parser: "rbiWss",
  dataset: "rbi_wss",
  anchorSeries: "ts_rbi_repo",
});

/**
 * RBI DBIE & Data Releases:
 * - Sectoral Deployment of Bank Credit: https://www.rbi.org.in/scripts/Data_Sectoral_Deployment.aspx
 * - Lending and Deposit Rates of Scheduled Commercial Banks (WALR): https://www.rbi.org.in/Scripts/Pr_DataRelease.aspx?SectionID=369&DateFilter=Year
 * - Monetary Policy Committee Meeting Minutes: https://www.rbi.org.in/scripts/Annualpolicy.aspx
 */
SOURCES.push({
  id: "rbi_dbie",
  urls: () => ["https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=63697"],
  reqs: () => [
    { url: "https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=63697" },
    { url: "https://www.rbi.org.in/scripts/BS_PressReleaseDisplay.aspx?prid=63702" },
    { url: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=63839" },
  ],
  perDate: false,
  fmt: "html",
  freq: "monthly",
  lagDays: 45,
  parser: "rbiDbie",
  dataset: "rbi_dbie",
  anchorSeries: "ts_rbi_credit_growth",
});

/**
 * NSDL Foreign Portfolio Investors (FPI) Trends & Sector Investment Data:
 * - Daily & Monthly trends: https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx, /Monthly.aspx
 * - Fortnightly Sector reports: https://www.fpi.nsdl.co.in/web/StaticReports/Fortnightly_Sector_wise_FII_Investment_Data/FIIInvestSector_Oct152026.html
 */
SOURCES.push({
  id: "nsdl_fpi",
  urls: () => [
    "https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx",
    "https://www.fpi.nsdl.co.in/web/Reports/Monthly.aspx",
    "https://www.fpi.nsdl.co.in/web/StaticReports/Fortnightly_Sector_wise_FII_Investment_Data/FIIInvestSector_Oct152026.html",
  ],
  reqs: () => [
    { url: "https://www.fpi.nsdl.co.in/web/Reports/Latest.aspx" },
    { url: "https://www.fpi.nsdl.co.in/web/Reports/Monthly.aspx" },
    { url: "https://www.fpi.nsdl.co.in/web/StaticReports/Fortnightly_Sector_wise_FII_Investment_Data/FIIInvestSector_Oct152026.html" },
  ],
  perDate: false,
  fmt: "html",
  freq: "weekly",
  lagDays: 3,
  parser: "nsdlFpi",
  dataset: "nsdl_fpi",
  anchorSeries: "ts_nsdl_fpi_net_equity_m",
});

/** NSDL Depository Statistics: Active client accounts, custody value. */
SOURCES.push({
  id: "nsdl_depo",
  urls: () => ["https://nsdl.com/about-us/statistics"],
  reqs: () => [{ url: "https://nsdl.com/about-us/statistics" }],
  perDate: false,
  fmt: "html",
  freq: "monthly",
  lagDays: 30,
  parser: "nsdlDepo",
  dataset: "nsdl_depo",
  anchorSeries: "ts_nsdl_client_accounts",
});

/** CDSL Depository Statistics: Active BO accounts. */
SOURCES.push({
  id: "cdsl_bo",
  urls: () => ["https://www.cdslindia.com/IncludesNew/js/Home/cdslupdate.js"],
  reqs: () => [{ url: "https://www.cdslindia.com/IncludesNew/js/Home/cdslupdate.js" }],
  perDate: false,
  fmt: "html",
  freq: "monthly",
  lagDays: 30,
  parser: "cdslBo",
  dataset: "cdsl_bo",
  anchorSeries: "ts_cdsl_bo_accounts",
});

/** NSE Shareholding Patterns: Market aggregate ownership shares by class. */
SOURCES.push({
  id: "shareholding",
  urls: () => ["https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol=RELIANCE"],
  reqs: () => [{ url: "https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol=RELIANCE" }],
  perDate: false,
  fmt: "html",
  freq: "monthly",
  lagDays: 45,
  parser: "nseShareholding",
  dataset: "shareholding",
  anchorSeries: "ts_ownership_promoter",
  nseCookie: true,
});


/**
 * NSE Margin Trading Facility (MTF) Daily Archives:
 * https://nsearchives.nseindia.com/archives/equities/margin/Margintrdg_{DDMMYY}.zip
 */
SOURCES.push({
  id: "nse_mtf",
  urls: (d) => {
    if (!d) return [];
    // Date format DDMMYY (e.g. 2026-10-22 -> 221026)
    const ddmmyy = d.slice(8, 10) + d.slice(5, 7) + d.slice(2, 4);
    return [`https://nsearchives.nseindia.com/archives/equities/margin/Margintrdg_${ddmmyy}.zip`];
  },
  perDate: true,
  fmt: "csv",
  freq: "daily",
  lagDays: 4,
  parser: "nseMtf",
  dataset: "nse_mtf",
  anchorSeries: "ts_mtf_book",
  nseCookie: true,
});


const MON_UPPER = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * NSE Wholesale Debt Market (WDM) Daily Traded G-Sec List:
 * https://nsearchives.nseindia.com/content/historical/WDM/{YYYY}/{MON}/wdmlist_{DDMMYYYY}.csv
 */
SOURCES.push({
  id: "nse_wdm",
  urls: (d) => {
    if (!d) return [];
    const mon = MON_UPPER[parseInt(d.slice(5, 7), 10) - 1];
    const ddmmyyyy = d.slice(8, 10) + d.slice(5, 7) + d.slice(0, 4);
    return [`https://nsearchives.nseindia.com/content/historical/WDM/${d.slice(0, 4)}/${mon}/wdmlist_${ddmmyyyy}.csv`];
  },
  perDate: true,
  fmt: "csv",
  freq: "daily",
  lagDays: 4,
  parser: "nseWdm",
  dataset: "nse_wdm",
  anchorSeries: "ts_gsec_10y",
  nseCookie: true,
});
