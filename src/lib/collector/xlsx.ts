import { unzipSync, strFromU8 } from "fflate";

export type Sheet = { name: string; rows: Map<number, Map<string, string | number>> };

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Minimal xlsx reader (values only, no formulas/styles) — enough for Damodaran's published datasets. */
export function readXlsx(buf: Uint8Array): { sheets: Sheet[]; date1904: boolean } {
  const files = unzipSync(buf);
  const text = (p: string) => (files[p] ? strFromU8(files[p]) : "");
  const wb = text("xl/workbook.xml");
  const rels = text("xl/_rels/workbook.xml.rels");
  const date1904 = /date1904="(1|true)"/.test(wb);
  const shared = [...text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")),
  );
  const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
  const relTarget = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id"), target = attr(m[0], "Target");
    if (id && target) relTarget.set(id, target);
  }
  const sheets: Sheet[] = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = attr(m[0], "name"), rid = attr(m[0], "r:id");
    const target = rid ? relTarget.get(rid) : undefined;
    if (!name || !target) continue;
    const xml = text(`xl/${target.replace(/^\//, "").replace(/^xl\//, "")}`);
    const rows = new Map<number, Map<string, string | number>>();
    for (const r of xml.matchAll(/<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = new Map<string, string | number>();
      for (const c of r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] ?? "")?.[1];
        if (v == null) continue;
        cells.set(c[1], /t="s"/.test(c[2]) ? shared[Number(v)] ?? "" : /t="str"/.test(c[2]) ? decode(v) : Number(v));
      }
      rows.set(Number(r[1]), cells);
    }
    sheets.push({ name: decode(name), rows });
  }
  return { sheets, date1904 };
}

/** Excel serial → YYYY-MM-DD. */
export function excelDate(serial: number, date1904: boolean): string {
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  return new Date(epoch + Math.round(serial) * 86_400_000).toISOString().slice(0, 10);
}
