import { downsample } from "@/lib/ts-charts/transform";
import type { Fmt } from "@/lib/ts-charts/format";
import type { ChartKind, ChartPayload } from "@/lib/ts-charts/types";

/**
 * NSE index desk data: published pages and JSON bundles from tipsheet.markets (NSE Indices data, source acknowledged).
 * Chart ids are `tsi.<page>.<n>`: page is "list" or an index slug, n is the chart's order on that page.
 */
const ORIGIN = "https://tipsheet.markets";
const REVALIDATE = 3600;
const SLUG = /^[a-z0-9-]{1,90}$/;

export const isTsiId = (id: string) => /^tsi\.(list|[a-z0-9-]{1,90})\.\d{1,2}$/.test(id);

async function get(path: string) {
  const r = await fetch(ORIGIN + path, { next: { revalidate: REVALIDATE }, headers: { "User-Agent": "MarketIntelligence/1.0 (+https://getmarketintelligence.in)" } });
  if (!r.ok) throw new Error(`source ${r.status}`);
  return r;
}
const page = async (slug: string | null) => {
  if (slug && !SLUG.test(slug)) throw new Error("bad slug");
  return (await get(slug ? `/indices/${slug}/` : "/indices/")).text();
};

const dec = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const txt = (s: string) => dec(s.replace(/<(script|style)[\s\S]*?<\/\1>/g, "").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
const attr = (s: string, a: string) => s.match(new RegExp(`\\b${a}="([^"]*)"`))?.[1];

export type Cell = { t: string; v?: number };
export type TableOut = { caption: string; headers: string[]; rows: { label: string; href?: string; cells: Cell[] }[] };
export type ListRow = { group: string; slug: string; name: string; spark: { d: string; up: boolean } | null; cells: Cell[] };
export type Kpi = { label: string; value: string; sub: string };
export type Block = { type: "chart"; id: string; name: string } | { type: "table"; table: TableOut };
export type ChartRef = { id: string; name: string };

const num = (s: string | undefined) => (s == null || s === "" || Number.isNaN(Number(s)) ? undefined : Number(s));

function parseTable(html: string, caption = ""): TableOut {
  const cap = txt(html.match(/<caption[^>]*>([\s\S]*?)<\/caption>/)?.[1] ?? "") || caption;
  const trs = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => [...m[1].matchAll(/<(t[hd])\b([^>]*)>([\s\S]*?)<\/\1>/g)].filter((c) => !/\bmc\b/.test(attr(c[2], "class") ?? "")));
  const headers = (trs[0] ?? []).map((c) => txt(c[3]));
  const rows = trs.slice(1).filter((r) => r.length).map((r) => {
    const [first, ...rest] = r;
    return {
      label: txt(first[3]),
      href: first[3].match(/href="(\/indices\/[a-z0-9-]+\/)"/)?.[1],
      cells: rest.map((c) => ({ t: txt(c[3]), v: num(attr(c[2], "data-v")) })),
    };
  });
  return { caption: cap, headers, rows };
}

/** Chart configs in page order. */
function figures(html: string): { cfg: Record<string, any>; name: string }[] { // eslint-disable-line @typescript-eslint/no-explicit-any
  return [...html.matchAll(/<figure\b[^>]*\bdata-chart="([^"]*)"/g)].flatMap((m) => {
    try { const cfg = JSON.parse(dec(m[1])); return [{ cfg, name: String(cfg.name ?? "") }]; } catch { return []; }
  });
}

export type ListPage = { rows: ListRow[]; headers: string[]; asOf: string; tables: TableOut[]; charts: ChartRef[] };

export async function buildList(): Promise<ListPage> {
  const html = await page(null);
  const main = html.match(/<table\b[\s\S]*?<\/table>/)?.[0] ?? "";
  const headers = [...(main.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? "").matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((m) => txt(m[1])).filter((h) => h && h !== "More");
  const rows: ListRow[] = [...main.matchAll(/<tr data-group="([^"]*)"[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => {
    const cs = [...m[2].matchAll(/<(t[hd])\b([^>]*)>([\s\S]*?)<\/\1>/g)];
    const th = cs[0];
    const spark = cs[1]?.[3].match(/<path d="([^"]+)"/);
    return {
      group: m[1],
      slug: th[3].match(/href="\/indices\/([a-z0-9-]+)\/"/)?.[1] ?? "",
      name: txt(th[3]),
      spark: spark ? { d: spark[1], up: /spark up/.test(cs[1][3]) } : null,
      cells: cs.slice(2).map((c) => ({ t: txt(c[3]), v: num(attr(c[2], "data-v")) })),
    };
  });
  const rest = html.slice(html.indexOf("</table>") + 8);
  const tables: TableOut[] = [];
  for (const m of rest.matchAll(/(?:<p class="tcap"[^>]*>([\s\S]*?)<\/p>\s*)?<div class="tablewrap[^"]*"[^>]*>\s*(<table\b[\s\S]*?<\/table>)/g)) tables.push(parseTable(m[2], txt(m[1] ?? "")));
  const charts = figures(html).map((f, i) => ({ id: `tsi.list.${i}`, name: f.name }));
  return { rows, headers, asOf: txt(html.match(/Data to ([0-9]{1,2} \w+ \d{4})/)?.[1] ?? ""), tables, charts };
}

export type IndexPage = { title: string; kpis: Kpi[]; sections: { id: string; title: string; blocks: Block[] }[]; asOf: string };

export async function buildIndex(slug: string): Promise<IndexPage> {
  const html = await page(slug);
  const title = txt(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? slug);
  const kpis = [...html.matchAll(/<dl class="(?:ixs|ix-tiles)"[\s\S]*?<\/dl>/g)].flatMap((d) =>
    [...d[0].matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>(?:\s*<small[^>]*>([\s\S]*?)<\/small>)?/g)].map((m) => ({ label: txt(m[1]), value: txt(m[2]), sub: txt(m[3] ?? "") })),
  );
  let n = 0;
  const sections = [...html.matchAll(/<section\b[^>]*\bid="([a-z-]+)"[^>]*>([\s\S]*?)<\/section>/g)]
    .filter((s) => s[1] !== "data")
    .map((s) => {
      const blocks: Block[] = [];
      let cap = "";
      for (const m of s[2].matchAll(/<figure\b[^>]*\bdata-chart="([^"]*)"|<p class="tcap"[^>]*>([\s\S]*?)<\/p>|<table\b[\s\S]*?<\/table>/g)) {
        if (m[1] != null) {
          let name = "";
          try { name = String(JSON.parse(dec(m[1])).name ?? ""); } catch { /* skip malformed config */ }
          blocks.push({ type: "chart", id: `tsi.${slug}.${n++}`, name });
        } else if (m[2] != null) cap = txt(m[2]);
        else { blocks.push({ type: "table", table: parseTable(m[0], cap) }); cap = ""; }
      }
      return { id: s[1], title: txt(s[2].match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? s[1]), blocks };
    });
  return { title, kpis, sections, asOf: txt(html.match(/Data to ([0-9]{1,2} \w+ \d{4})/)?.[1] ?? "") };
}

const KIND: Record<string, ChartKind> = { line: "line", area: "area", bars: "bars" };

export async function buildTsiChart(id: string): Promise<ChartPayload | null> {
  const [, slug, n] = id.split(".");
  const f = figures(await page(slug === "list" ? null : slug))[Number(n)];
  if (!f) return null;
  const { cfg } = f;
  const data = cfg.data ?? (cfg.src && /^\/data\/v1\/[a-z0-9_\/.\-]+\.json$/.test(cfg.src) ? await (await get(cfg.src)).json() : null);
  if (!data) return null;
  const series = (cfg.series as { col: string; label: string; slot?: number }[]).filter((s) => data.series?.[s.col]);
  const rows = (data.dates as string[])
    .map((date, i) => {
      const row: ChartPayload["rows"][number] = { date };
      for (const s of series) row[s.col] = data.series[s.col][i] ?? null;
      return row;
    })
    .filter((r) => (!cfg.from || r.date >= cfg.from) && series.some((s) => r[s.col] != null));
  return {
    id,
    kind: KIND[cfg.kind] ?? "line",
    title: f.name,
    source: `${data.meta?.source ?? "NSE Indices"}; compiled by tipsheet.markets`,
    methodUrl: `${ORIGIN}/methods/`,
    updated: rows.at(-1)?.date ?? "never",
    fmt: (cfg.fmt ?? "num") as Fmt,
    digits: cfg.digits ?? 1,
    series,
    rows: downsample(rows, 1500),
  };
}
