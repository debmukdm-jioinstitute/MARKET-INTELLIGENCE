import { getText } from "../http";
import type { Collector, Obs } from "../types";

const BASE = "https://data-api.ecb.europa.eu/service/data/";
const SERIES = [
  { path: "FM/B.U2.EUR.4F.KR.MRR_FR.LEV", id: "ecb_mro_rate", label: "ECB main refinancing rate", unit: "%", n: 40 },
  { path: "EXR/D.USD.EUR.SP00.A", id: "eurusd", label: "EUR/USD (ECB reference)", unit: "USD", n: 250 },
  { path: "ICP/M.U2.N.000000.4.ANR", id: "ea_hicp_yoy", label: "Euro area HICP inflation (YoY)", unit: "%", n: 36 },
];

/** ECB SDW CSV: TIME_PERIOD and OBS_VALUE columns located by header name. */
function parse(csv: string): Obs[] {
  const [head, ...rows] = csv.trim().split(/\r?\n/);
  const cols = head.split(",");
  const ti = cols.indexOf("TIME_PERIOD");
  const vi = cols.indexOf("OBS_VALUE");
  if (ti < 0 || vi < 0) throw new Error("ECB CSV header changed");
  return rows.flatMap((r) => {
    const c = r.split(",");
    const v = Number(c[vi]);
    if (!Number.isFinite(v) || !c[ti]) return [];
    const d = c[ti].length === 7 ? `${c[ti]}-01` : c[ti];
    return [{ date: d, value: v }];
  });
}

export const ecb: Collector = {
  id: "ecb",
  async run() {
    return Promise.all(
      SERIES.map(async (s) => {
        const url = `${BASE}${s.path}?lastNObservations=${s.n}&format=csvdata`;
        const obs = parse(await getText(url));
        if (!obs.length) throw new Error(`ECB empty: ${s.id}`);
        return { id: s.id, label: s.label, unit: s.unit, category: "macro" as const, provider: "European Central Bank", url, obs };
      }),
    );
  },
};
