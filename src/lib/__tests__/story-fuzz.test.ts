import { it, expect } from "vitest";
import * as S from "@/lib/story";
import { formatDate, isoToDmy } from "@/lib/format";
const bad: any[] = [NaN, Infinity, -Infinity, null, undefined, 0, -0, 1e21, "x"];
it("never throws / never prints NaN", () => {
  const out: string[] = [];
  for (const a of bad) for (const b of bad) {
    const calls = [
      () => S.moved(a), () => S.breadthHeadline(a, b), () => S.breadthDeck(a, b, a, b, a),
      () => S.flowHeadline(a, b), () => S.pcrHeadline("N", a, b),
      () => S.indexHeadline([{ name: "Nifty 50", changePct: a }, { name: "X", changePct: b }]),
      () => S.indexDeck([{ name: "A", changePct: a }, { name: "B", changePct: b }]),
      () => S.rankDeck([{ name: "A", changePct: a }, { name: "B", changePct: b }], "x"),
      () => S.flowPeriodDeck({ today: a, m1: a, ytd: b }, { today: b, m1: b, ytd: a }),
      () => S.macroDeck([{ indicator: "i", current: a, previous: b, unit: "%" }]),
      () => S.yieldHeadline([{ tenor: "10Y", value: a }], [{ tenor: "10Y", value: b }]),
      () => S.curveDeck([{ tenor: "10Y", value: a }, { tenor: "2Y", value: b }]),
    ];
    for (const c of calls) { const r = c(); if (typeof r === "string") out.push(r); }
  }
  const badOut = out.filter((s) => /NaN|Infinity|undefined|null|\$\{/.test(s));
  console.log([...new Set(badOut)].slice(0, 20));
  expect(badOut).toEqual([]);
});
it("dates", () => {
  for (const v of ["", "garbage", NaN, new Date("x"), 8.64e15 + 1]) expect(formatDate(v as any)).toBe("—");
  expect(formatDate("2026-10-24")).toBe("24-10-2026");
  expect(formatDate("2026-12-31T20:00:00Z")).toBe("01-01-2027");
  expect(formatDate(1792800000000, { time: true })).toMatch(/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/);
  expect(isoToDmy(null)).toBe("");
  expect(isoToDmy("a 2026-10-24 b 2026-01-02")).toBe("a 24-10-2026 b 02-01-2026");
});
