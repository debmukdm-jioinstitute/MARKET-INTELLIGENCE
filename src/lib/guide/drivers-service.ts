import { fetchCompanyAbout } from "@/lib/feeds/company-about";
import { NIFTY_500 } from "@/lib/prowess/nifty500";
import { AUTHORITY_URL, driversFor, type DriverKind } from "./business-lines";
import { companyFeed, evidenceFor, type Evidence } from "./driver-news";
import { fetchStockProfile } from "./profile";
import { resolveLines } from "./resolve-lines";
import { hfEnabled, semanticRelevance } from "./semantic";

const NIFTY = new Map(NIFTY_500.map((r) => [r[0], r] as const));

export type DriverCard = {
  id: string;
  label: string;
  kind: DriverKind;
  authority: string;
  authorityUrl: string | null;
  why: string;
  lineLabel: string;
  active: boolean;
  evidenceCount: number;
  evidence: Evidence[];
};
export type DriversPayload = {
  symbol: string;
  lines: { id: string; label: string }[];
  how: "rules" | "text" | "semantic" | "generic";
  drivers: DriverCard[];
  newsChecked: boolean;
};

const timeout = <T,>(ms: number) => new Promise<T | null>((r) => setTimeout(() => r(null), ms));

/** Business-line drivers + live evidence for ANY NSE symbol. Rules, text inference and free news RSS; HF optional. */
export async function buildDrivers(symbol: string, nameHint?: string | null): Promise<DriversPayload> {
  const row = NIFTY.get(symbol);
  const name = (nameHint || row?.[1] || symbol).slice(0, 120);
  const industry = row?.[2] ?? null;

  const resolved = await resolveLines(symbol, name, industry, async () => (await fetchCompanyAbout(name))?.extract ?? null, () => fetchStockProfile(symbol));
  const drivers = driversFor(resolved.lines, 7);

  const coItems = await Promise.race([companyFeed(name), timeout<never[]>(5_000)]);
  const company = { name, feed: coItems ?? [] };
  const settled = await Promise.race([Promise.all(drivers.map((d) => evidenceFor(d, company))), timeout<never>(8_000)]);

  // Optional semantic filter: drop keyword hits that are not really about the driver (needs HF_TOKEN).
  if (settled && hfEnabled()) {
    await Promise.all(
      settled.map(async (ev, i) => {
        const sims = await semanticRelevance(`${drivers[i]!.label}. ${drivers[i]!.why}`, ev.items.map((e) => e.title));
        if (!sims) return;
        const keep = ev.items.filter((_, j) => sims[j]! >= 0.18 || ev.items[j]!.company);
        ev.items = keep;
        ev.count = Math.min(ev.count, Math.max(keep.length, 0));
        if (!keep.length) ev.active = false;
      }),
    );
  }

  const cards: DriverCard[] = drivers.map((d, i) => {
    const ev = settled?.[i];
    return {
      id: d.id,
      label: d.label,
      kind: d.kind,
      authority: d.authority,
      authorityUrl: AUTHORITY_URL[d.authority] || null,
      why: d.why,
      lineLabel: d.lineLabel,
      active: ev?.active ?? false,
      evidenceCount: ev?.count ?? 0,
      evidence: ev?.items ?? [],
    };
  });
  const hasCo = (c: DriverCard) => c.evidence.some((e) => e.company);
  const ranked = cards
    .map((c, i) => ({ c, i }))
    .sort((a, b) => Number(hasCo(b.c)) - Number(hasCo(a.c)) || Number(b.c.active) - Number(a.c.active) || b.c.evidenceCount - a.c.evidenceCount || a.i - b.i)
    .map((x) => x.c);

  return { symbol, lines: resolved.lines.map((l) => ({ id: l.id, label: l.label })), how: resolved.how, drivers: ranked.slice(0, 6), newsChecked: settled !== null };
}
