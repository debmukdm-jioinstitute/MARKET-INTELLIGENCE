import { BUSINESS_LINES } from "./business-lines";

/**
 * Business-line inference for stocks that no name rule or NSE industry label covers (the long tail of
 * ~2,000 NSE-listed names). Zero cost, in-process: BM25-style scoring of the company's name, industry
 * and (when available) its public description against a document per business line.
 */

/** Words that identify what a business sells. Kept short; the drivers' own text is added automatically. */
const LINE_TERMS: Record<string, string> = {
  etf: "etf index fund exchange traded fund nifty sensex gold etf silver etf liquid fund gilt",
  "packaging-plastics": "packaging plastics containers packaging containers polymer pipes films laminates bottles glass cans moulded",
  "bank-private": "bank banking deposits loans branches retail banking casa lender banks regional banks diversified banks",
  "bank-psu": "public sector bank nationalised bank government bank",
  nbfc: "nbfc finance lending loans housing finance vehicle finance microfinance mortgage credit lender credit services mortgage finance financial conglomerates",
  "gold-loan": "gold loan gold finance pawn jewellery loan credit services",
  "insurance-distribution": "insurance broker insurance marketplace policy aggregator distribution commission",
  "insurance-life": "life insurance annuity pension protection ulip insurance life",
  "insurance-general": "general insurance health insurance motor insurance reinsurance claims underwriting insurance property casualty",
  "amc-broking": "asset management mutual fund broking brokerage wealth management demat registrar investment capital markets asset management financial data stock exchanges",
  "exchange-depository": "stock exchange depository clearing commodity exchange power exchange market infrastructure",
  "payments-fintech": "payments wallet upi fintech payment gateway merchant acquiring digital",
  "credit-cards": "credit card consumer finance personal loan retail lending",
  "it-services": "software services it services digital engineering outsourcing consulting offshore client technology information technology services software infrastructure software application consulting",
  pharma: "pharmaceutical drug formulations generics api active pharmaceutical ingredient medicines biologics usfda drug manufacturers specialty generic biotechnology pharmaceutical",
  "hospitals-diagnostics": "hospital healthcare diagnostics pathology clinic medical beds patients medical care facilities diagnostics research health information medical devices",
  "auto-oem": "automobile vehicles cars two wheelers motorcycles trucks tractors commercial vehicle passenger vehicle auto manufacturers recreational vehicles farm heavy construction machinery",
  "auto-parts": "auto components automotive parts tyres batteries castings forgings suspension auto parts rubber plastics",
  fmcg: "consumer goods fmcg packaged food personal care household products brands soaps beverages packaged foods household personal products confectioners beverages non-alcoholic farm products",
  "alcohol-tobacco": "liquor spirits beer cigarettes tobacco distillery brewery",
  "consumer-internet": "online platform e-commerce app delivery marketplace internet quick commerce startups users internet retail internet content information department stores specialty retail",
  "retail-apparel": "retail stores apparel footwear jewellery fashion lifestyle showrooms apparel retail luxury goods footwear accessories apparel manufacturing",
  telecom: "telecom mobile network spectrum towers broadband subscribers telecom services communication equipment",
  power: "power generation electricity thermal hydro transmission distribution discom utility utilities regulated electric independent power producers renewable utilities",
  renewables: "solar wind renewable green energy modules turbines",
  "oil-marketing": "petrol diesel fuel retail marketing lubricants lpg refinery oil gas refining marketing oil gas midstream",
  "upstream-oil": "oil exploration crude production drilling blocks natural gas fields oil gas e p oil gas integrated",
  "refining-petchem": "refining petrochemicals polymers polyester chemicals complex",
  "city-gas": "city gas cng png pipeline lng gas distribution",
  coal: "coal mining mines minerals iron ore thermal coal coking coal other precious metals",
  steel: "steel iron stainless pipes tubes wires alloys sponge iron pig iron steel metal fabrication industrial metals",
  "non-ferrous": "aluminium copper zinc smelter non ferrous metals recycling lead aluminum copper other industrial metals mining",
  cement: "cement building materials tiles ceramics plywood laminates sanitaryware pipes bricks building materials building products equipment",
  "capital-goods": "engineering capital goods equipment machinery epc construction infrastructure projects cables switchgear transformers bearings pumps specialty industrial machinery electrical equipment parts engineering construction infrastructure operations tools accessories",
  defence: "defence aerospace shipbuilding missiles radar electronics military naval aerospace defense",
  railways: "railway wagons locomotives rail projects coaches",
  realty: "real estate developer residential commercial projects housing township real estate development real estate services reit",
  chemicals: "specialty chemicals agrochemicals dyes pigments fluorochemicals intermediates specialty chemicals chemicals agricultural inputs",
  "fertilizers-agri": "fertiliser fertilizer urea dap agrochemicals seeds crop protection agri inputs agricultural inputs",
  "sugar-ethanol": "sugar ethanol distillery cane molasses confectioners farm products",
  aviation: "airline aircraft airport flights passengers aviation airlines airports air services",
  "logistics-shipping": "logistics shipping ports container freight warehousing cargo courier supply chain marine shipping integrated freight logistics railroads trucking airports air services",
  "consumer-durables": "appliances air conditioners fans electronics consumer durables wires lighting electronic manufacturing consumer electronics electronic components furnishings fixtures appliances",
  textiles: "textiles yarn fabric garments apparel cotton spinning weaving home textiles textile manufacturing",
  media: "media television broadcasting films multiplex music publishing newspapers radio entertainment gaming entertainment broadcasting publishing advertising agencies electronic gaming multimedia",
  "hotels-travel": "hotels resorts restaurants quick service travel tourism leisure food service lodging restaurants travel services resorts casinos leisure",
  "agri-food": "rice edible oil agri commodities food processing dairy poultry seafood aquaculture plantations tea coffee farm products packaged foods agricultural",
  paints: "paints coatings adhesives sealants waterproofing",
};

const STOP = new Set("ltd limited india indian the and of for a an co corp corporation company industries industry enterprises group holdings services private pvt inc plc".split(" "));
const tok = (s: string) => (s.toLowerCase().match(/[a-z][a-z&]{2,}/g) ?? []).filter((w) => !STOP.has(w));

type Doc = { id: string; tf: Map<string, number>; len: number };
let INDEX: { docs: Doc[]; idf: Map<string, number>; avg: number } | null = null;

function buildIndex() {
  const docs: Doc[] = BUSINESS_LINES.map((l) => {
    const text = [l.label, LINE_TERMS[l.id] ?? "", LINE_TERMS[l.id] ?? "", ...l.drivers.map((d) => `${d.label} ${d.why}`)].join(" ");
    const tf = new Map<string, number>();
    for (const w of tok(text)) tf.set(w, (tf.get(w) ?? 0) + 1);
    return { id: l.id, tf, len: [...tf.values()].reduce((a, b) => a + b, 0) };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const w of d.tf.keys()) df.set(w, (df.get(w) ?? 0) + 1);
  const N = docs.length;
  const idf = new Map([...df].map(([w, n]) => [w, Math.log(1 + (N - n + 0.5) / (n + 0.5))]));
  return { docs, idf, avg: docs.reduce((a, d) => a + d.len, 0) / N };
}

export type LineGuess = { id: string; score: number };

/** Best-matching business lines for free text, strongest first. Empty when nothing clears the confidence floor. */
export function inferLines(text: string, k = 2, minScore = 2.2): LineGuess[] {
  INDEX ??= buildIndex();
  const q = new Map<string, number>();
  for (const w of tok(text)) q.set(w, (q.get(w) ?? 0) + 1);
  if (!q.size) return [];
  const K1 = 1.2;
  const B = 0.6;
  const scored = INDEX.docs.map((d) => {
    let s = 0;
    for (const [w, qn] of q) {
      const f = d.tf.get(w);
      if (!f) continue;
      s += (INDEX!.idf.get(w) ?? 0) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / INDEX!.avg))) * Math.min(qn, 2);
    }
    return { id: d.id, score: s };
  });
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.score ?? 0;
  if (best < minScore) return [];
  // Keep runners-up only when close to the leader.
  return scored.filter((x, i) => i === 0 || x.score >= best * 0.7).slice(0, k);
}
