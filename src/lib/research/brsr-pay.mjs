/** Pure, source-grounded BRSR Principle 5 Q3(a) extraction, shared by Node batch and app. */
export const PAY_CATEGORIES = ["Board of Directors", "Key Managerial Personnel", "Employees (non-board, non-KMP)", "Workers"];
export const PAY_PARSER_VERSION = 3;
/** Preserve the calendar date stated by NSE, independently of a laptop's timezone. */
export function filingDateIso(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  let candidate = /^\d{4}-\d{2}-\d{2}(?:\b|T)/.test(text) ? text.slice(0, 10) : null;
  const parts = /^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})\b/.exec(text);
  if (parts) {
    const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(parts[2].toLowerCase()) + 1;
    if (!month) return null;
    candidate = `${parts[3]}-${String(month).padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  }
  if (!candidate) return null;
  const date = new Date(`${candidate}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== candidate ? null : candidate;
}
const LABEL = /Board\s+of\s+Directors(?:\s*\(\s*BoD\s*\))?(?:\s*[-–]\s*(?:Whole\s+Time|Executive|Non[-\s]?Executive)\s+Directors)?|Key\s+(?:Managerial|Management)\s+Personnel(?:\s*\(\s*KMP\s*\))?|\bKMP\b|Employees(?:\s*\(\d+\))?\s*(?:\(|,)?\s*(?:other\s+than|excluding|except)\s*(?:BoD|Board\s+of\s+Directors)\s*(?:and|&|,)\s*KMPs?\s*\)?|\bWorkers\b/gi;
const CELL = /^(\d[\d,]*(?:\.\d+)?|Nil|N\s*\/?\s*A\.?|N\.A\.|Not\s+Applicable|[-–—])(?:\s*(lakhs?|lacs?|crores?|Cr|millions?|rupees|INR|Rs\.?))?(?=[*#$^†‡]|\s|$)/i;
const multiplier = (s) => /lakh|lacs?\b/i.test(s) ? 1e5 : /crore|\bcr\b/i.test(s) ? 1e7 : /million/i.test(s) ? 1e6 : 1;
const cellNumber = (text) => {
  if (!/^\d/.test(text)) return null;
  // A truncated PDF token such as 3,47,94 is not reliable Indian/Western
  // grouping. Keep that cell unknown instead of silently stripping commas.
  if (text.includes(",") && !/^\d{1,3}(?:,\d{2,3})*,\d{3}(?:\.\d+)?$/.test(text)) return null;
  return Number(text.replace(/,/g, ""));
};
export function validatePayRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > 4) return false;
  const seen = new Set();
  for (const r of rows) {
    if (!PAY_CATEGORIES.includes(r.category) || seen.has(r.category)) return false;
    seen.add(r.category);
    for (const sex of ["male", "female"]) {
      const count = r[`${sex}Count`], median = r[`${sex}Median`];
      if (count !== null && (!Number.isSafeInteger(count) || count < 0)) return false;
      if (median !== null && (!Number.isFinite(median) || median <= 0 || count === 0 || count === null)) return false;
    }
  }
  return rows.some((r) => r.category === PAY_CATEGORIES[2] && (r.maleMedian !== null || r.femaleMedian !== null));
}
export function parseBrsrPay(text) {
  const t = text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const markers = [...t.matchAll(/median\s+(?:remuneration|salary|wages)|remuneration\s*\/\s*salary\s*\/\s*wages/gi)];
  for (const marker of markers) {
    const start = marker.index;
    const segment = t.slice(start, start + 14000);
    const hits = [...segment.matchAll(LABEL)];
    const bodyStart = segment.search(/Board\s+of\s+Directors|\bBoD\b|Key\s+(?:Managerial|Management)\s+Personnel|\bKMP\b|Employees|Workers/i);
    const header = segment.slice(0, Math.min(bodyStart < 0 ? 500 : bodyStart, 500));
    const scale = header.match(/\blakhs?\b|\blacs?\b|\bcrores?\b|\bCr\b|\bmillions?\b/i);
    const before = [...t.slice(Math.max(0, start - 300), start).matchAll(/\blakhs?\b|\blacs?\b|\bcrores?\b|\bCr\b|\bmillions?\b|\brupees\b|\bINR\b|\bRs\b/gi)].at(-1);
    // Currency symbols name the currency, not the scale: a ₹ header can still
    // refer to a preceding "in lakhs" caption.
    const unit = scale ? multiplier(scale[0]) : /\bin\s+(?:rupees|Rs\.?|INR)\b/i.test(header) ? 1 : multiplier(before?.[0] ?? "");
    const rows = new Map();
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      const name = h[0];
      const category = /^Board/i.test(name) ? PAY_CATEGORIES[0] : /^(Key|KMP)/i.test(name) ? PAY_CATEGORIES[1] : /^Employees/i.test(name) ? PAY_CATEGORIES[2] : PAY_CATEGORIES[3];

      let tail = segment.slice(h.index + name.length, hits[i + 1]?.index ?? segment.length).replace(/\(\d{1,2}\)/g, " ").replace(/^[\s*#$^†‡):]+/, "").replace(/^of\s+the\s+(?:Company|Organisation|Organization|Entity)\s*[*#$^†‡]*/i, "").trimStart();
      if (category === PAY_CATEGORIES[2] && /\b(?:Junior|Middle|Senior)\b/i.test(tail)) {
        const total = /\bTotal\s+/i.exec(tail);
        if (!total) continue;
        tail = tail.slice(total.index + total[0].length);
      }
      const cells = [];
      for (let cell = 0; cell < 8; cell++) {
        tail = tail.replace(/^(?:₹|`|INR|Rs\.?)\s*/i, "");
        const m = CELL.exec(tail);
        if (!m) break;
        cells.push({ value: cellNumber(m[1]), unit: m[2] ? multiplier(m[2]) : unit });
        tail = tail.slice(m[0].length).replace(/^[\s*#$^†‡]+/, "");
      }
      // A numeric superscript sometimes becomes an extra cell. Accept it only with
      // a matching numbered note, never by guessing which number is the count.
      if (cells.length === 5 && /^[1-9]$/.test(String(cells[0].value)) && new RegExp(`Notes?:[\\s\\S]*?\\b${cells[0].value}\\s+[A-Za-z]`, "i").test(segment)) cells.shift();
      const thirdGender = /\bMale\s+Female\s+(?:Other|Others|Transgender)\b/i.test(segment.slice(0, h.index));
      // Some rupee PDF text runs split a median's digits. Only join with the
      // explicit six-column schema and a single extra token.
      if (thirdGender && unit === 1 && cells.length === 7) {
        for (const index of [1, 3]) {
          const first = cells[index].value, second = cells[index + 1].value;
          if (Number.isInteger(first) && first > 0 && first < 1000 && Number.isInteger(second) && second >= 100000 && second < 1000000) {
            cells.splice(index, 2, { value: Number(`${first}${second}`), unit: 1 }); break;
          }
        }
      }
      if (cells.length !== 4 && !(thirdGender && cells.length === 6)) continue;
      // Large whole-rupee figures under a scaled caption are an ambiguous source
      // layout (or filing error). Decline the table instead of guessing a unit.
      if (cells.some((c, index) => index % 2 && c.value !== null && c.unit > 1 && c.value >= 100000)) return [];
      const values = cells.map(({ value, unit: scale }, index) => value === null ? null : index % 2 ? value > 0 ? Math.round(value * scale * 100) / 100 : null : value);
      const [maleCount, maleMedian, femaleCount, femaleMedian] = values;
      if ([maleCount, femaleCount].some((n) => n !== null && (!Number.isSafeInteger(n) || n < 0))) continue;
      if ((maleMedian !== null && (maleCount === 0 || maleCount === null)) || (femaleMedian !== null && (femaleCount === 0 || femaleCount === null))) continue;
      rows.set(category, { category, maleCount, maleMedian, femaleCount, femaleMedian });
    }
    const result = PAY_CATEGORIES.flatMap((category) => rows.has(category) ? [rows.get(category)] : []);
    if (validatePayRows(result)) return result;
  }
  return [];
}
export function payRatios(rows) {
  const emp = rows.find((r) => r.category === PAY_CATEGORIES[2]);
  const median = emp?.maleMedian ?? emp?.femaleMedian;
  if (!median) return [];
  return rows.filter((r) => r.category !== PAY_CATEGORIES[2] && r.category !== "Workers").flatMap((r) => {
    const top = Math.max(r.maleMedian ?? 0, r.femaleMedian ?? 0);
    return top > 0 ? [{ label: `${r.category} vs employee median`, times: Math.round(top / median * 10) / 10 }] : [];
  });
}

/** Scan the full report with adjacent-page windows. No copyrighted report is persisted. */
export async function extractBrsrPay(bytes, { maxPages = 600, timeoutMs = 90000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  const { getDocumentProxy } = await import("unpdf");
  const proxy = await getDocumentProxy(bytes, { stopAtErrors: false });
  const destroy = () => proxy.loadingTask.destroy().catch(() => {});
  const timer = setTimeout(() => { void destroy(); }, Math.max(1, deadline - Date.now()));
  let prev = "";
  let previousPage = 0;
  try {
    for (let i = 1; i <= Math.min(proxy.numPages, maxPages); i++) {
      if (Date.now() >= deadline) throw new Error("PDF scan time limit reached");
      let text;
      try {
        const page = await proxy.getPage(i);
        const content = await page.getTextContent();
        text = content.items.map((v) => "str" in v ? v.str : "").join(" ");
        page.cleanup?.();
      } catch { prev = ""; continue; }
      const joined = `${prev} ${text}`;
      if (/median\s+(?:remuneration|salary|wages)|remuneration\s*\/\s*salary\s*\/\s*wages/i.test(joined)) {
        const rows = parseBrsrPay(joined);
        if (validatePayRows(rows)) {
          const evidenceStart = Math.max(0, joined.search(/median\s+(?:remuneration|salary|wages)|remuneration\s*\/\s*salary\s*\/\s*wages/i) - 300);
          return { rows, pages: prev ? [previousPage, i] : [i], evidence: joined.slice(evidenceStart, evidenceStart + 18000), totalPages: proxy.numPages };
        }
      }
      prev = text; previousPage = i;
    }
    return { rows: [], pages: [], evidence: "", totalPages: proxy.numPages, reason: proxy.numPages > maxPages ? "PDF page limit reached" : "Pay table not found or failed validation" };
  } finally { clearTimeout(timer); await destroy(); }
}
