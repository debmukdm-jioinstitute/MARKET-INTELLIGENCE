/**
 * Broker research desk directory.
 *
 * A plain directory of Indian institutional equity research desks (public
 * website links only). This file intentionally contains NO coverage counts,
 * report data, target prices, or ratings — those must come from the real
 * ingested `research_reports` table via /api/research-reports. Never add
 * hardcoded numbers here.
 */
export interface BrokerSource {
  broker: string;
  portalName: string;
  url: string;
}

export const BROKER_SOURCES: BrokerSource[] = [
  { broker: "Motilal Oswal", portalName: "MOFSL Institutional Equities", url: "https://www.motilaloswal.com/" },
  { broker: "ICICI Securities", portalName: "ICICI Direct Institutional Research", url: "https://www.icicidirect.com/" },
  { broker: "HDFC Securities", portalName: "HDFC Sec Institutional Research (HSIE)", url: "https://www.hdfcsec.com/" },
  { broker: "Kotak Securities", portalName: "Kotak Institutional Equities (KIE)", url: "https://www.kotaksecurities.com/" },
  { broker: "Axis Securities", portalName: "Axis Direct Research Desk", url: "https://simplehai.axisdirect.in/" },
  { broker: "Emkay Global", portalName: "Emkay Global Financial Services", url: "https://www.emkayglobal.com/" },
  { broker: "JM Financial", portalName: "JM Financial Institutional Securities", url: "https://www.jmfl.com/" },
  { broker: "Nuvama", portalName: "Nuvama Institutional Equities (formerly Edelweiss)", url: "https://www.nuvama.com/" },
  { broker: "Prabhudas Lilladher", portalName: "PL India Research Desk", url: "https://www.plindia.com/" },
  { broker: "Yes Securities", portalName: "YES Securities Institutional Research", url: "https://www.yesinvest.in/" },
  { broker: "IIFL Securities", portalName: "IIFL Institutional Equities", url: "https://www.indiainfoline.com/" },
];
