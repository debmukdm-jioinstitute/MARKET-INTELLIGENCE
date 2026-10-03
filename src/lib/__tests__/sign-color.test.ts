import { describe, expect, it } from "vitest";
import { signTone, splitSigned } from "@/lib/sign-color";
import { formatPct } from "@/lib/format";

describe("signTone", () => {
  it("handles hyphen, true minus, en dash and parentheses as negative", () => {
    for (const s of ["-0.88%", "−0.88%", "–0.88%", "(−3.1%)", "-9484 Cr", "−₹1,200"]) expect(signTone(s)).toBe("down");
  });
  it("treats plus and unsigned non-zero changes as positive, zero as flat", () => {
    for (const s of ["+0.73%", "+10042 Cr", "0.73%", "+₹5"]) expect(signTone(s)).toBe("up");
    for (const s of ["0.00%", "+0.00%", "−0.00%", "—", "", "n/a"]) expect(signTone(s)).toBe("flat");
  });
  it("reads numbers and the app's own formatter output", () => {
    expect(signTone(-0.01)).toBe("down");
    expect(signTone(2)).toBe("up");
    expect(signTone(0)).toBe("flat");
    expect(signTone(null)).toBe("flat");
    expect(signTone(formatPct(-0.0088))).toBe("down");
    expect(signTone(formatPct(0.0073))).toBe("up");
  });
});

describe("splitSigned", () => {
  const tones = (t: string) => splitSigned(t).filter((p) => p.tone !== "flat").map((p) => `${p.tone}:${p.text.trim()}`);
  it("colours only explicitly signed numbers", () => {
    expect(tones("FII -9484 Cr · DII +10042 Cr")).toEqual(["down:-9484 Cr", "up:+10042 Cr"]);
    expect(tones("Nifty down (−0.88%)")).toEqual(["down:−0.88%"]);
  });
  it("leaves dates, ranges and unsigned values alone", () => {
    expect(tones("96.30 · 102.25 · 7.18%")).toEqual([]);
    expect(tones("03 Oct 2026, 2026-10-03, 10-20 range")).toEqual([]);
  });
  it("round-trips the text", () => {
    const t = "A -1.5% B +2% C";
    expect(splitSigned(t).map((p) => p.text).join("")).toBe(t);
  });
});
