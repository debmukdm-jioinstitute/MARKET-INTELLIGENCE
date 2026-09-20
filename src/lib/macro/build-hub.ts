import { buildIndiaDashboard } from "@/lib/feeds/india/build-dashboard";
import {
  fetchIndiaCreditGrowthRow,
  fetchIndiaWpiRow,
  scaleFxReservesRow,
} from "@/lib/feeds/india/india-macro";
import { fetchMospiMacro } from "@/lib/feeds/sources/mospi";
import {
  cpiYoYFromIndex,
  fetchCpiGroupBreakdown,
  fetchCpiIndexSeries,
  fetchFredMetric,
  fetchWorldBankIndicator,
  inflationMomentum,
  metricFromRow,
  staticCpiBasket,
} from "@/lib/macro/data-fetch";
import { buildRegimeBlock } from "@/lib/macro/regime";
import { MACRO_SECTIONS } from "@/lib/macro/sections-meta";
import type { IndiaMacroHubPayload, MacroMetric, MacroSectionId, MacroSectionPayload } from "@/lib/macro/types";

function section(
  id: MacroSectionId,
  metrics: MacroMetric[],
  highlights: string[],
): MacroSectionPayload {
  const meta = MACRO_SECTIONS.find((s) => s.id === id)!;
  return {
    id,
    title: meta.title,
    subtitle: meta.subtitle,
    metrics,
    highlights,
  };
}

function linkMetric(
  id: string,
  label: string,
  hint: string,
  url: string,
  provider: string,
): MacroMetric {
  return {
    id,
    label,
    value: null,
    unit: "link",
    history: [],
    source: { provider, url },
    hint: `${hint} · Open →`,
  };
}

export async function buildIndiaMacroHub(): Promise<IndiaMacroHubPayload> {
  const dashboard = await buildIndiaDashboard();
  const cpiIndex = await fetchCpiIndexSeries();
  const cpiGroups = await fetchCpiGroupBreakdown();
  const momentum = inflationMomentum(cpiIndex.length ? cpiIndex : []);
  const cpiYoySeries = cpiYoYFromIndex(cpiIndex);

  const [
    gdpNom,
    gdpReal,
    gdpPc,
    gdpDeflator,
    privCons,
    govCons,
    gfcf,
    exports,
    imports,
    agri,
    mfg,
    construction,
    iipFred,
    wpiRow,
    creditRow,
    fiscalDef,
    taxRev,
    debt,
    unemp,
    lfpr,
    fdi,
    tradeBal,
    mospi,
    usGdp,
    cnGdp,
    euGdp,
    usCpi,
    brent,
    dxy,
    vix,
    us10y,
  ] = await Promise.all([
    fetchWorldBankIndicator("IN", "NY.GDP.MKTP.CD", "Nominal GDP", "USD bn"),
    fetchWorldBankIndicator("IN", "NY.GDP.MKTP.KD.ZG", "Real GDP growth", "% y/y"),
    fetchWorldBankIndicator("IN", "NY.GDP.PCAP.KD.ZG", "GDP per capita growth", "% y/y"),
    fetchWorldBankIndicator("IN", "NY.GDP.DEFL.KD.ZG", "GDP deflator growth", "% y/y"),
    fetchWorldBankIndicator("IN", "NE.CON.PRVT.ZS", "Private consumption", "% GDP"),
    fetchWorldBankIndicator("IN", "NE.CON.GOVT.ZS", "Government consumption", "% GDP"),
    fetchWorldBankIndicator("IN", "NE.GDI.FTOT.ZS", "Gross fixed capital formation", "% GDP"),
    fetchWorldBankIndicator("IN", "NE.EXP.GNFS.ZS", "Exports", "% GDP"),
    fetchWorldBankIndicator("IN", "NE.IMP.GNFS.ZS", "Imports", "% GDP"),
    fetchWorldBankIndicator("IN", "NV.AGR.TOTL.ZS", "Agriculture GVA", "% GDP"),
    fetchWorldBankIndicator("IN", "NV.IND.MANF.ZS", "Manufacturing GVA", "% GDP"),
    fetchWorldBankIndicator("IN", "NV.IND.TOTL.ZS", "Industry GVA", "% GDP"),
    fetchFredMetric("INDPROINDMISMEI", "in_iip_fred", "Industrial production index", "index"),
    fetchIndiaWpiRow(),
    fetchIndiaCreditGrowthRow(),
    fetchWorldBankIndicator("IN", "GC.DOD.TOTL.GD.ZS", "Central govt debt", "% GDP"),
    fetchWorldBankIndicator("IN", "GC.TAX.TOTL.GD.ZS", "Tax revenue", "% GDP"),
    fetchWorldBankIndicator("IN", "GC.DOD.TOTL.GD.ZS", "Government debt", "% GDP"),
    fetchWorldBankIndicator("IN", "SL.UEM.TOTL.ZS", "Unemployment", "%"),
    fetchWorldBankIndicator("IN", "SL.TLF.TOTL.IN", "Labour force participation", "%"),
    fetchWorldBankIndicator("IN", "BX.KLT.DINV.CD.WD", "FDI net inflows", "USD bn"),
    fetchWorldBankIndicator("IN", "BN.GSR.GNFS.CD", "Trade balance", "USD bn"),
    fetchMospiMacro().catch(() => []),
    fetchFredMetric("GDP", "us_gdp", "US GDP", "Bn USD"),
    fetchFredMetric("CHNGDPNQDSMEI", "cn_gdp", "China GDP index", "index"),
    fetchFredMetric("CLVMNACSCAB1GQEA19", "eu_gdp", "Euro area GDP", "index"),
    fetchFredMetric("CPIAUCSL", "us_cpi", "US CPI", "index"),
    fetchFredMetric("DCOILBRENTEU", "brent_fred", "Brent crude", "USD/bbl"),
    fetchFredMetric("DTWEXBGS", "dxy", "Trade-weighted USD (DXY proxy)", "index"),
    fetchFredMetric("VIXCLS", "vix", "VIX", "index"),
    fetchFredMetric("DGS10", "us10y", "US 10Y Treasury", "%"),
  ]);

  const macroCpi = dashboard.indiaMacro.find((m) => m.id.includes("cpi") || m.indicator.includes("CPI"));
  const macroGdp = dashboard.indiaMacro.find((m) => m.indicator.includes("GDP"));
  const gsec = dashboard.indiaMacro.find((m) => m.id === "gsec10y_live");
  const mospiCpi = mospi[0];

  const headlineCpi =
    cpiYoySeries[cpiYoySeries.length - 1]?.value ??
    macroCpi?.current ??
    (mospiCpi ? null : null);
  const headlineCpiPrev =
    cpiYoySeries[cpiYoySeries.length - 2]?.value ?? macroCpi?.previous ?? null;

  const regime = buildRegimeBlock({
    gdpGrowth: macroGdp?.current ?? gdpReal.current,
    gdpGrowthPrev: macroGdp?.previous ?? gdpReal.previous,
    cpiYoy: headlineCpi,
    cpiYoyPrev: headlineCpiPrev,
    creditGrowth: creditRow.current ?? dashboard.indiaMacro.find((m) => m.id === "in_credit")?.current ?? null,
    gsec10y: gsec?.current ?? dashboard.pulse.gsec10y.value,
    gsec10yPrev: gsec?.previous ?? null,
    fiscalDeficitPct: taxRev.current != null ? 100 - taxRev.current : null,
    usdInrChgPct: dashboard.globalRadar.usdInr.changePct ?? null,
    gdpHistory: gdpReal.history12m.length ? gdpReal.history12m : macroGdp?.history12m ?? [],
    cpiHistory: cpiYoySeries.length ? cpiYoySeries : macroCpi?.history12m ?? [],
  });

  const gvaChildren: MacroMetric[] = [
    metricFromRow(agri),
    metricFromRow(mfg),
    metricFromRow(construction),
    linkMetric(
      "gva_mining",
      "Mining & quarrying",
      "Granular GVA — MOSPI national accounts",
      "https://www.mospi.gov.in/",
      "MOSPI",
    ),
    linkMetric("gva_elec", "Electricity, gas & water", "MOSPI sector tables", "https://www.mospi.gov.in/", "MOSPI"),
    linkMetric(
      "gva_trade",
      "Trade, hotels & transport",
      "MOSPI sector tables",
      "https://www.mospi.gov.in/",
      "MOSPI",
    ),
    linkMetric(
      "gva_fin",
      "Financial & business services",
      "MOSPI sector tables",
      "https://www.mospi.gov.in/",
      "MOSPI",
    ),
    linkMetric("gva_re", "Real estate & dwellings", "MOSPI sector tables", "https://www.mospi.gov.in/", "MOSPI"),
    linkMetric("gva_pub", "Public administration", "MOSPI sector tables", "https://www.mospi.gov.in/", "MOSPI"),
  ];

  const iipRow = dashboard.indiaMacro.find((m) => m.id.includes("iip") || m.indicator.includes("IIP"));

  const hfGrowth: MacroMetric[] = [
    ...(iipRow ? [metricFromRow(iipRow)] : []),
    iipFred,
    linkMetric("hf_core", "Core industries index", "Office of Economic Adviser", "https://eaindustry.nic.in/", "GoI"),
    linkMetric("hf_mfg_pmi", "Manufacturing PMI", "S&P Global / RBI references", "https://www.rbi.org.in/", "RBI"),
    linkMetric("hf_svc_pmi", "Services PMI", "S&P Global", "https://www.pmi.spglobal.com/", "S&P Global"),
    linkMetric(
      "hf_elec",
      "Electricity demand",
      "National load despatch — daily reports",
      "https://posoco.in/reports/daily-reports",
      "POSOCO",
    ),
    linkMetric("hf_rail", "Railway freight", "Indian Railways statistics", "https://indianrailways.gov.in/", "Railways"),
    linkMetric("hf_ports", "Port traffic", "Sagarmala / MoPSW", "https://sagarmala.gov.in/", "MoPSW"),
    linkMetric("hf_eway", "E-way bills", "GSTN / NIC", "https://www.gst.gov.in/", "GSTN"),
    linkMetric("hf_fastag", "FASTag toll transactions", "NHAI", "https://www.nhai.gov.in/", "NHAI"),
    linkMetric("hf_fuel", "Fuel consumption", "PPAC", "https://www.ppac.gov.in/", "PPAC"),
    linkMetric("hf_cement", "Cement production", "CMA India", "https://www.cementindia.org/", "CMA"),
    linkMetric("hf_cv", "Commercial vehicle sales", "SIAM", "https://www.siam.in/", "SIAM"),
    linkMetric("hf_tractor", "Tractor sales", "Tractor industry releases", "https://www.tractorjunction.com/", "Industry"),
  ];

  const cpiChildren: MacroMetric[] = (cpiGroups.length ? cpiGroups : staticCpiBasket()).map((g, i) => ({
    id: `cpi_grp_${i}`,
    label: g.group,
    value: g.index,
    unit: g.weight != null ? `index · ~${g.weight}% weight` : "index / weight proxy",
    history: [],
    source: {
      provider: cpiGroups.length ? "MOSPI / data.gov.in" : "Illustrative basket (MOSPI weights)",
      url: "https://www.mospi.gov.in/",
    },
  }));

  const wpiChildren: MacroMetric[] = [
    linkMetric("wpi_primary", "Primary articles", "WPI subgroup — MOSPI", "https://www.mospi.gov.in/", "MOSPI"),
    linkMetric("wpi_fuel", "Fuel & power", "WPI subgroup", "https://www.mospi.gov.in/", "MOSPI"),
    linkMetric("wpi_mfg", "Manufactured products", "WPI subgroup", "https://www.mospi.gov.in/", "MOSPI"),
    linkMetric("wpi_chem", "Chemicals", "WPI subgroup", "https://www.mospi.gov.in/", "MOSPI"),
    linkMetric("wpi_metals", "Metals", "WPI subgroup", "https://www.mospi.gov.in/", "MOSPI"),
    linkMetric("wpi_oils", "Mineral oils", "WPI subgroup", "https://www.mospi.gov.in/", "MOSPI"),
  ];

  const fxRes = dashboard.indiaMacro.find((m) => m.indicator.includes("FX"));
  const scaledFx = fxRes ? scaleFxReservesRow(fxRes) : null;

  const sections: Record<MacroSectionId, MacroSectionPayload> = {
    regime: section("regime", [], [
      `Current quadrant: ${regime.overallLabel}`,
      "Regime history uses aligned GDP growth vs CPI y/y (open data).",
    ]),
    growth: section(
      "growth",
      [
        metricFromRow(gdpReal),
        metricFromRow(gdpNom),
        metricFromRow(gdpPc),
        metricFromRow(gdpDeflator),
        {
          id: "gdp_expenditure",
          label: "GDP expenditure split",
          value: null,
          unit: "% GDP",
          history: [],
          source: { provider: "World Bank", url: "https://data.worldbank.org/country/india" },
          children: [
            metricFromRow(privCons),
            metricFromRow(govCons),
            metricFromRow(gfcf),
            metricFromRow(exports),
            metricFromRow(imports),
          ],
        },
        {
          id: "gva_sectors",
          label: "GVA by sector",
          value: null,
          unit: "% GDP",
          history: [],
          source: { provider: "World Bank / MOSPI", url: "https://www.mospi.gov.in/" },
          children: gvaChildren,
        },
        {
          id: "hf_growth",
          label: "High-frequency growth pulse",
          value: null,
          unit: "—",
          history: [],
          source: { provider: "Mixed open sources", url: "https://www.mospi.gov.in/" },
          children: hfGrowth,
        },
      ],
      ["GDP is lagging; use HF panel for nowcast.", "GVA detail links to MOSPI national accounts."],
    ),
    inflation: section(
      "inflation",
      [
        {
          id: "cpi_headline",
          label: "Headline CPI",
          value: headlineCpi,
          unit: "% y/y",
          previous: headlineCpiPrev,
          history: cpiYoySeries.slice(-24),
          source: macroCpi?.source ?? { provider: "MOSPI", url: "https://www.mospi.gov.in/" },
        },
        {
          id: "cpi_core_proxy",
          label: "Core CPI (ex-food & fuel proxy)",
          value: null,
          unit: "% y/y",
          history: [],
          source: { provider: "RBI bulletin / MOSPI", url: "https://www.rbi.org.in/" },
          hint: "Publish core from RBI bulletin when available",
        },
        {
          id: "cpi_food",
          label: "Food CPI",
          value: null,
          unit: "% y/y",
          history: [],
          source: { provider: "MOSPI", url: "https://www.mospi.gov.in/" },
        },
        {
          id: "cpi_basket",
          label: "CPI basket decomposition",
          value: null,
          unit: "—",
          history: [],
          source: { provider: "MOSPI / data.gov.in", url: "https://www.mospi.gov.in/" },
          children: cpiChildren,
        },
        {
          id: "infl_momentum",
          label: "Inflation momentum",
          value: momentum.yoy,
          unit: "%",
          history: [],
          source: { provider: "Computed from CPI index", url: "https://api.data.gov.in/" },
          children: [
            {
              id: "mom_1m",
              label: "1M annualised",
              value: momentum.m1,
              unit: "%",
              history: [],
              source: { provider: "Computed", url: "#" },
            },
            {
              id: "mom_3m",
              label: "3M annualised",
              value: momentum.m3,
              unit: "%",
              history: [],
              source: { provider: "Computed", url: "#" },
            },
            {
              id: "mom_6m",
              label: "6M annualised",
              value: momentum.m6,
              unit: "%",
              history: [],
              source: { provider: "Computed", url: "#" },
            },
            {
              id: "mom_yoy",
              label: "YoY",
              value: momentum.yoy,
              unit: "%",
              history: [],
              source: { provider: "Computed", url: "#" },
            },
          ],
        },
        metricFromRow(wpiRow),
        {
          id: "wpi_decomp",
          label: "WPI decomposition",
          value: wpiRow.current,
          unit: "% y/y",
          history: wpiRow.history12m,
          source: wpiRow.source,
          children: wpiChildren,
        },
        {
          id: "crude_infl",
          label: "Brent crude (inflation input)",
          value: brent.value,
          unit: brent.unit,
          history: brent.history,
          source: brent.source,
        },
      ],
      ["Momentum annualises recent CPI index moves — useful for investors vs single YoY print."],
    ),
    "rates-liquidity": section(
      "rates-liquidity",
      [
        {
          id: "rbi_repo",
          label: "Policy repo",
          value: dashboard.indiaMacro.find((m) => m.indicator.includes("Repo"))?.current ?? null,
          unit: "%",
          history: dashboard.indiaMacro.find((m) => m.indicator.includes("Repo"))?.history12m ?? [],
          source: dashboard.indiaMacro.find((m) => m.indicator.includes("Repo"))?.source ?? {
            provider: "RBI",
            url: "https://www.rbi.org.in/",
          },
          hint: "Verify vs latest MPC resolution",
        },
        gsec
          ? metricFromRow(gsec)
          : {
              id: "gsec10y",
              label: "10Y G-Sec",
              value: dashboard.pulse.gsec10y.value,
              previous: null,
              unit: "%",
              history: [],
              source: dashboard.pulse.gsec10y.source,
            },
        ...dashboard.rbiLiquidity.rows.map((r, i) => ({
          id: `rbi_row_${i}`,
          label: r.label,
          value: r.value ? Number.parseFloat(r.value) : null,
          unit: r.value?.includes("%") ? "%" : "—",
          history: [],
          source: r.source,
          hint: r.value ?? undefined,
        })),
        {
          id: "liquidity_ops",
          label: "System liquidity & RBI operations",
          value: null,
          unit: "₹ cr",
          history: [],
          source: { provider: "RBI", url: "https://www.rbi.org.in/Scripts/BS_ViewBulletin.aspx" },
          children: [
            linkMetric("liq_sys", "System liquidity surplus/deficit", "RBI weekly statistical supplement", "https://www.rbi.org.in/", "RBI"),
            linkMetric("liq_vrr", "Variable rate repos (VRR / VRRR)", "RBI auctions", "https://www.rbi.org.in/", "RBI"),
            linkMetric("liq_msf", "MSF", "RBI policy corridor", "https://www.rbi.org.in/", "RBI"),
            linkMetric("liq_sdf", "Standing deposit facility (SDF)", "RBI policy corridor", "https://www.rbi.org.in/", "RBI"),
          ],
        },
        {
          id: "money_agg",
          label: "Monetary aggregates",
          value: null,
          unit: "—",
          history: [],
          source: { provider: "RBI NSD", url: "https://www.rbi.org.in/Scripts/AnnualPublications.aspx?head=Handbook%20of%20Statistics%20on%20Indian%20Economy" },
          children: [
            linkMetric("m0", "M0 / Reserve money", "RBI National Summary Data", "https://www.rbi.org.in/", "RBI"),
            linkMetric("m1", "M1", "RBI NSD", "https://www.rbi.org.in/", "RBI"),
            linkMetric("m3", "M3", "RBI NSD", "https://www.rbi.org.in/", "RBI"),
            linkMetric("cic", "Currency in circulation", "RBI NSD", "https://www.rbi.org.in/", "RBI"),
          ],
        },
        {
          id: "banking",
          label: "Banking",
          value: creditRow.current,
          unit: "% y/y",
          history: creditRow.history12m,
          source: creditRow.source,
          children: [
            metricFromRow(creditRow),
            metricFromRow(dashboard.indiaMacro.find((m) => m.id === "in_deposit") ?? creditRow),
            linkMetric("cd_ratio", "Credit / deposit ratio", "RBI scheduled commercial banks", "https://www.rbi.org.in/", "RBI"),
          ],
        },
      ],
      ["RBI Watch: policy corridor + NSD for M3 and liquidity.", "Bank credit from RBI / data.gov.in with WB fallback."],
    ),
    fiscal: section(
      "fiscal",
      [
        metricFromRow(taxRev),
        metricFromRow(fiscalDef),
        metricFromRow(debt),
        linkMetric("gst", "GST collections", "GST revenue reports", "https://www.gst.gov.in/", "GSTN"),
        linkMetric("capex", "Government capex", "Union budget / CGA", "https://cga.gov.in/", "CGA"),
        linkMetric("borrowing", "Market borrowing calendar", "RBI state gov & GOI auctions", "https://www.rbi.org.in/", "RBI"),
      ],
      ["GST and monthly deficit from CGA / MoF — linked for drill-down."],
    ),
    consumer: section(
      "consumer",
      [
        linkMetric("auto", "Auto sales (PV + 2W)", "SIAM monthly", "https://www.siam.in/", "SIAM"),
        linkMetric("fmcg", "FMCG volume proxy", "Nielsen / company results", "https://www.nielsen.com/", "Nielsen"),
        linkMetric("upi", "UPI transaction value & volume", "NPCI", "https://www.npci.org.in/", "NPCI"),
        linkMetric("cards", "Credit card spends", "RBI payment statistics", "https://www.rbi.org.in/", "RBI"),
        linkMetric("retail", "Retail sales proxy", "RBI consumer confidence", "https://www.rbi.org.in/", "RBI"),
        linkMetric("housing", "Housing starts / registrations", "RERA / PropTiger", "https://rera.gov.in/", "RERA"),
      ],
      ["Consumer pulse links to primary publishers — no synthetic retail data."],
    ),
    corporate: section(
      "corporate",
      [
        linkMetric("earnings", "Nifty earnings growth", "NSE / company filings", "https://www.nseindia.com/", "NSE"),
        linkMetric("margins", "Operating margin trend", "Screener aggregated results", "https://www.screener.in/", "Screener"),
        linkMetric("capacity", "Capacity utilisation (manufacturing)", "RBI OBICUS survey", "https://www.rbi.org.in/", "RBI"),
        metricFromRow(creditRow),
        linkMetric("ibc", "Insolvency / bankruptcies", "IBBI statistics", "https://www.ibbi.gov.in/", "IBBI"),
      ],
      ["Corporate block ties credit impulse to earnings cycle."],
    ),
    external: section(
      "external",
      [
        {
          id: "usdinr",
          label: "USD / INR",
          value: dashboard.pulse.usdInr.value,
          unit: "INR",
          change: dashboard.pulse.usdInr.change ?? undefined,
          history: [],
          source: dashboard.pulse.usdInr.source,
        },
        metricFromRow(exports),
        metricFromRow(imports),
        metricFromRow(tradeBal),
        scaledFx ? metricFromRow(scaledFx) : metricFromRow(fxRes ?? tradeBal),
        metricFromRow(fdi),
      ],
      ["FX reserves scaled to USD bn when World Bank reports full units."],
    ),
    employment: section(
      "employment",
      [
        metricFromRow(unemp),
        metricFromRow(lfpr),
        linkMetric("epfo", "EPFO payroll net adds", "EPFO monthly payroll", "https://www.epfindia.gov.in/", "EPFO"),
        linkMetric("naukri", "Naukri JobSpeak index", "Naukri.com", "https://www.naukri.com/job-speak", "Naukri"),
        linkMetric("plfs", "PLFS WPR / LFPR", "MOSPI PLFS", "https://www.mospi.gov.in/", "MOSPI"),
      ],
      ["CMIE unemployment is proprietary — WB + PLFS links used here."],
    ),
    global: section(
      "global",
      [
        usGdp,
        cnGdp,
        euGdp,
        usCpi,
        brent,
        dxy,
        vix,
        us10y,
        {
          id: "global_quotes",
          label: "Live global tape",
          value: null,
          unit: "—",
          history: [],
          source: { provider: "Yahoo / dashboard", url: "https://finance.yahoo.com/" },
          children: Object.entries(dashboard.globalRadar).map(([k, q]) => ({
            id: `gr_${k}`,
            label: k.replace(/([A-Z])/g, " $1").trim(),
            value: q.value,
            unit: q.value != null && k.includes("10y") ? "%" : "—",
            change: q.change ?? undefined,
            history: [],
            source: q.source,
          })),
        },
      ],
      ["US / China / EU from FRED; tape from India dashboard global radar."],
    ),
  };

  return {
    fetchedAt: dashboard.fetchedAt,
    regime,
    sections,
  };
}
