import ExcelJS from "exceljs";
import { BRAND, DISCLAIMER_LINES, DISCLAIMER_SHORT } from "./branding";

export type ColFmt = "text" | "int" | "num" | "num4" | "pct" | "pctPts" | "date" | "link";
export interface Col {
  header: string;
  key: string;
  width?: number;
  fmt?: ColFmt;
}
export interface SheetSpec {
  /** Excel sheet name (≤ 31 chars, unique). */
  name: string;
  title: string;
  description: string;
  /** Human-readable source line shown under the title. */
  source?: string;
  cols: Col[];
  rows: Record<string, unknown>[];
  notes?: string[];
}
export interface BuilderLog {
  builder: string;
  status: "ok" | "failed" | "skipped";
  sheets: string[];
  ms: number;
  message?: string;
}
export interface WorkbookMeta {
  generatedAt: Date;
  exportId: string;
  generatedFor: string;
  logo?: Buffer | null;
  logs: BuilderLog[];
}

const FMT: Record<ColFmt, string | undefined> = {
  text: undefined,
  int: "#,##0",
  num: "#,##0.00",
  num4: "#,##0.0000",
  pct: "0.00%", // fraction (0.0123 → 1.23%)
  pctPts: '0.00"%"', // already in percent points
  date: "yyyy-mm-dd",
  link: undefined,
};

const font = (o: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> => ({ name: BRAND.font, size: 10, color: { argb: `FF${BRAND.ink}` }, ...o });
const fill = (rgb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb: `FF${rgb}` } });
const thin: Partial<ExcelJS.Border> = { style: "thin", color: { argb: `FF${BRAND.border}` } };

/** Excel forbids these characters in sheet names. */
const safeName = (s: string) => s.replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
const colLetter = (n: number) => {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};
const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);

function normalise(v: unknown, fmt: ColFmt): ExcelJS.CellValue {
  if (v == null || v === "") return null;
  if (fmt === "link") return isUrl(v) ? { text: v, hyperlink: v } : String(v);
  if (fmt === "date") {
    const d = v instanceof Date ? v : new Date(String(v));
    return Number.isNaN(d.getTime()) ? String(v) : d;
  }
  if (fmt === "text") return typeof v === "object" ? JSON.stringify(v) : String(v);
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : String(v);
}

function brandBand(ws: ExcelJS.Worksheet, wb: ExcelJS.Workbook, meta: WorkbookMeta, width: number, logoId: number | null) {
  const last = Math.max(width, 6);
  ws.getRow(1).height = 44;
  for (let c = 1; c <= last; c++) ws.getCell(1, c).fill = fill(BRAND.band);
  if (logoId !== null) ws.addImage(logoId, { tl: { col: 0.15, row: 0.12 }, ext: { width: 150, height: 36 } });
  ws.mergeCells(1, 4, 1, last);
  const tag = ws.getCell(1, 4);
  tag.value = "DATA EXPORT  ·  getmarketintelligence.in";
  tag.font = font({ bold: true, size: 10, color: { argb: `FF${BRAND.primary}` } });
  tag.alignment = { horizontal: "right", vertical: "middle" };
  void wb;
  void meta;
}

/** Adds one branded data sheet. Returns the row count written. */
function addDataSheet(wb: ExcelJS.Workbook, spec: SheetSpec, meta: WorkbookMeta, logoId: number | null) {
  const ws = wb.addWorksheet(safeName(spec.name), { properties: { tabColor: { argb: `FF${BRAND.primary}` } }, views: [{ state: "frozen", ySplit: 7, showGridLines: false }] });
  const width = spec.cols.length;
  brandBand(ws, wb, meta, width, logoId);

  const span = Math.max(width, 6);
  const line = (r: number, value: string | ExcelJS.CellValue, f: Partial<ExcelJS.Font>, height?: number) => {
    ws.mergeCells(r, 1, r, span);
    const c = ws.getCell(r, 1);
    c.value = value;
    c.font = font(f);
    c.alignment = { vertical: "middle", wrapText: true };
    if (height) ws.getRow(r).height = height;
  };
  line(2, spec.title, { size: 18, bold: true }, 30);
  line(3, spec.description, { size: 10, color: { argb: `FF${BRAND.muted}` }, italic: true }, 30);
  ws.mergeCells(4, 1, 4, span);
  const src = ws.getCell(4, 1);
  src.value = { text: `${spec.source ? `Source: ${spec.source}   ·   ` : ""}Generated ${meta.generatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC   ·   ← Back to Contents`, hyperlink: "#'Contents'!A1" } as ExcelJS.CellValue;
  src.font = font({ size: 9, color: { argb: `FF${BRAND.primary}` } });
  line(5, DISCLAIMER_SHORT, { size: 8, color: { argb: `FF${BRAND.muted}` } }, 16);
  ws.getRow(6).height = 6;

  // table header
  const header = ws.getRow(7);
  header.height = 24;
  spec.cols.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = font({ bold: true, color: { argb: "FFFFFFFF" } });
    cell.fill = fill(BRAND.primary);
    cell.alignment = { vertical: "middle", horizontal: c.fmt && c.fmt !== "text" && c.fmt !== "link" && c.fmt !== "date" ? "right" : "left", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: `FF${BRAND.primaryDark}` } } };
    ws.getColumn(i + 1).width = c.width ?? (c.fmt === "link" ? 44 : c.fmt === "text" || !c.fmt ? 24 : 14);
  });

  // body
  spec.rows.forEach((row, r) => {
    const excelRow = ws.getRow(8 + r);
    spec.cols.forEach((c, i) => {
      const fmt = c.fmt ?? "text";
      const cell = excelRow.getCell(i + 1);
      cell.value = normalise(row[c.key], fmt);
      cell.font = font(fmt === "link" && isUrl(row[c.key]) ? { color: { argb: `FF${BRAND.primary}` }, underline: true } : {});
      const nf = FMT[fmt];
      if (nf) cell.numFmt = nf;
      cell.alignment = { vertical: "top", horizontal: ["int", "num", "num4", "pct", "pctPts"].includes(fmt) ? "right" : "left", wrapText: fmt === "text" && (c.width ?? 24) >= 40 };
      cell.border = { bottom: thin };
      if (r % 2 === 1) cell.fill = fill(BRAND.zebra);
    });
  });

  if (!spec.rows.length) {
    ws.mergeCells(8, 1, 8, span);
    const c = ws.getCell(8, 1);
    c.value = "No records were available for this section at the time of export.";
    c.font = font({ italic: true, color: { argb: `FF${BRAND.muted}` } });
  } else {
    ws.autoFilter = { from: { row: 7, column: 1 }, to: { row: 7, column: width } };
  }

  const footerRow = 9 + spec.rows.length;
  (spec.notes ?? []).forEach((n, i) => {
    ws.mergeCells(footerRow + i, 1, footerRow + i, span);
    const c = ws.getCell(footerRow + i, 1);
    c.value = n;
    c.font = font({ size: 9, italic: true, color: { argb: `FF${BRAND.muted}` } });
    c.alignment = { wrapText: true, vertical: "top" };
    ws.getRow(footerRow + i).height = 28;
  });

  ws.headerFooter.oddFooter = `&L&8${BRAND.name} — personal use only, licensed data&R&8Page &P of &N`;
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  return spec.rows.length;
}

function addCover(wb: ExcelJS.Workbook, meta: WorkbookMeta, logoId: number | null, specs: SheetSpec[]) {
  const ws = wb.addWorksheet("Cover", { properties: { tabColor: { argb: `FF${BRAND.primaryDark}` } }, views: [{ showGridLines: false }] });
  ws.columns = [{ width: 4 }, { width: 30 }, { width: 84 }, { width: 4 }];
  for (let r = 1; r <= 9; r++) for (let c = 1; c <= 4; c++) ws.getCell(r, c).fill = fill(BRAND.band);
  if (logoId !== null) ws.addImage(logoId, { tl: { col: 1, row: 1.2 }, ext: { width: 240, height: 58 } });
  ws.getRow(3).height = 30;

  ws.mergeCells("B7:C7");
  const t = ws.getCell("B7");
  t.value = "Market Intelligence — Complete Data Export";
  t.font = font({ size: 24, bold: true });
  ws.getRow(7).height = 40;
  ws.mergeCells("B8:C8");
  ws.getCell("B8").value = "Every dataset behind the platform, structured tab by tab, with sources linked.";
  ws.getCell("B8").font = font({ size: 12, color: { argb: `FF${BRAND.muted}` } });
  ws.getRow(8).height = 22;

  const meta1: [string, string][] = [
    ["Generated", `${meta.generatedAt.toISOString().slice(0, 19).replace("T", " ")} UTC`],
    ["Prepared for", meta.generatedFor],
    ["Export ID", meta.exportId],
    ["Sheets", `${specs.length} data sheets + Contents, Sources & Licences, Export Log`],
    ["Website", BRAND.site],
  ];
  meta1.forEach(([k, v], i) => {
    const r = 11 + i;
    ws.getCell(r, 2).value = k;
    ws.getCell(r, 2).font = font({ bold: true, color: { argb: `FF${BRAND.muted}` } });
    ws.getCell(r, 3).value = k === "Website" ? { text: v, hyperlink: v } : v;
    ws.getCell(r, 3).font = font(k === "Website" ? { color: { argb: `FF${BRAND.primary}` }, underline: true } : {});
  });
  ws.getCell(14, 3).value = `${specs.length} data sheets + Contents, Sources & Licences, Export Log`;
  const to = ws.getCell(16, 2);
  to.value = { text: "Open the Contents sheet →", hyperlink: "#'Contents'!A1" } as ExcelJS.CellValue;
  to.font = font({ bold: true, size: 12, color: { argb: `FF${BRAND.primary}` }, underline: true });

  // disclaimer box
  ws.mergeCells("B19:C19");
  const h = ws.getCell("B19");
  h.value = "IMPORTANT — TERMS OF USE & DISCLAIMER";
  h.font = font({ bold: true, size: 12, color: { argb: "FFFFFFFF" } });
  h.fill = fill(BRAND.primary);
  ws.getRow(19).height = 26;
  h.alignment = { vertical: "middle", indent: 1 };
  DISCLAIMER_LINES.forEach((line, i) => {
    const r = 20 + i;
    ws.mergeCells(r, 2, r, 3);
    const c = ws.getCell(r, 2);
    c.value = `${i === 0 || i === 2 ? "" : "•  "}${line}`;
    c.font = font(i === 0 || i === 2 ? { bold: true, color: { argb: `FF${BRAND.bad}` } } : { size: 10 });
    c.alignment = { wrapText: true, vertical: "top", indent: 1 };
    c.fill = fill("FEF7F6".slice(0, 6));
    c.border = { left: { style: "thin", color: { argb: `FF${BRAND.border}` } }, right: { style: "thin", color: { argb: `FF${BRAND.border}` } }, bottom: i === DISCLAIMER_LINES.length - 1 ? thin : undefined };
    ws.getRow(r).height = line.length > 130 ? 46 : line.length > 70 ? 32 : 20;
  });
  ws.mergeCells("B28:C28");
  const f = ws.getCell("B28");
  f.value = `Made with ❤ by Debabrata Mukherjee from Jio Institute, Room no 507  ·  ${BRAND.email}`;
  f.font = font({ italic: true, size: 9, color: { argb: `FF${BRAND.muted}` } });
}

function addContents(wb: ExcelJS.Workbook, meta: WorkbookMeta, logoId: number | null, specs: SheetSpec[], counts: Map<string, number>) {
  const ws = wb.addWorksheet("Contents", { properties: { tabColor: { argb: `FF${BRAND.primaryDark}` } }, views: [{ state: "frozen", ySplit: 7, showGridLines: false }] });
  const cols: Col[] = [
    { header: "#", key: "n", fmt: "int", width: 6 },
    { header: "Sheet", key: "sheet", fmt: "link", width: 30 },
    { header: "What's inside", key: "desc", fmt: "text", width: 78 },
    { header: "Rows", key: "rows", fmt: "int", width: 10 },
    { header: "Primary source(s)", key: "src", fmt: "text", width: 48 },
  ];
  brandBand(ws, wb, meta, cols.length, logoId);
  ws.mergeCells(2, 1, 2, 5);
  ws.getCell(2, 1).value = "Contents";
  ws.getCell(2, 1).font = font({ size: 18, bold: true });
  ws.getRow(2).height = 30;
  ws.mergeCells(3, 1, 3, 5);
  ws.getCell(3, 1).value = "Click a sheet name to jump to it. Every sheet has a “← Back to Contents” link in its header.";
  ws.getCell(3, 1).font = font({ italic: true, color: { argb: `FF${BRAND.muted}` } });
  ws.mergeCells(5, 1, 5, 5);
  ws.getCell(5, 1).value = DISCLAIMER_SHORT;
  ws.getCell(5, 1).font = font({ size: 8, color: { argb: `FF${BRAND.muted}` } });
  cols.forEach((c, i) => {
    const cell = ws.getCell(7, i + 1);
    cell.value = c.header;
    cell.font = font({ bold: true, color: { argb: "FFFFFFFF" } });
    cell.fill = fill(BRAND.primary);
    cell.alignment = { vertical: "middle" };
    ws.getColumn(i + 1).width = c.width!;
  });
  ws.getRow(7).height = 24;
  const rows = [
    ...specs.map((s) => ({ name: s.name, desc: s.description, rows: counts.get(s.name) ?? s.rows.length, src: s.source ?? "" })),
    { name: "Sources & Licences", desc: "Every data provider behind the site, what it supplies, and where to find the original.", rows: -1, src: "" },
    { name: "Export Log", desc: "What was included, what could not be fetched at export time, and why.", rows: -1, src: "" },
  ];
  rows.forEach((r, i) => {
    const row = ws.getRow(8 + i);
    row.getCell(1).value = i + 1;
    row.getCell(2).value = { text: r.name, hyperlink: `#'${safeName(r.name)}'!A1` } as ExcelJS.CellValue;
    row.getCell(2).font = font({ color: { argb: `FF${BRAND.primary}` }, underline: true, bold: true });
    row.getCell(3).value = r.desc;
    row.getCell(3).alignment = { wrapText: true, vertical: "top" };
    row.getCell(4).value = r.rows >= 0 ? r.rows : null;
    row.getCell(4).numFmt = "#,##0";
    row.getCell(5).value = r.src;
    row.getCell(5).alignment = { wrapText: true, vertical: "top" };
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      if (c !== 2) cell.font = font();
      cell.border = { bottom: thin };
      if (i % 2 === 1) cell.fill = fill(BRAND.zebra);
      if (c === 1 || c === 4) cell.alignment = { horizontal: "right", vertical: "top" };
    }
    row.height = r.desc.length > 95 ? 30 : 18;
  });
}

/** Builds the branded workbook: Cover, Contents, all data sheets, Sources & Licences, Export Log. */
export async function buildWorkbook(specs: SheetSpec[], sourcesSheet: SheetSpec, meta: WorkbookMeta): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = `${BRAND.name} (${BRAND.site})`;
  wb.title = `${BRAND.name} — Complete Data Export`;
  wb.subject = "Personal use only. Licensed data and assets. Not for reproduction unless authorised.";
  wb.company = BRAND.name;
  wb.description = DISCLAIMER_SHORT;
  wb.created = meta.generatedAt;

  const logoId = meta.logo ? wb.addImage({ buffer: meta.logo as unknown as ExcelJS.Buffer, extension: "png" }) : null;

  // export log sheet
  const logSheet: SheetSpec = {
    name: "Export Log",
    title: "Export Log",
    description: "Which parts of the platform were included in this workbook and anything that could not be fetched when it was generated.",
    cols: [
      { header: "Section", key: "builder", width: 34 },
      { header: "Status", key: "status", width: 12 },
      { header: "Sheets produced", key: "sheets", width: 60 },
      { header: "Time (ms)", key: "ms", fmt: "int", width: 12 },
      { header: "Note", key: "message", width: 80 },
    ],
    rows: meta.logs.map((l) => ({ ...l, sheets: l.sheets.join(", ") })),
  };

  addCover(wb, meta, logoId, specs);
  const counts = new Map<string, number>();
  // Contents must come 2nd; create it now, fill after we know counts (rows are known from specs).
  addContents(wb, meta, logoId, specs, counts);
  for (const s of specs) counts.set(s.name, addDataSheet(wb, s, meta, logoId));
  addDataSheet(wb, sourcesSheet, meta, logoId);
  addDataSheet(wb, logSheet, meta, logoId);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
