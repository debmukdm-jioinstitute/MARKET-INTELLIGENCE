import { describe, expect, it } from "vitest";
import { buildIndexSignalBlock } from "./ensemble-index-model";
import type { Bar } from "./types";

function syntheticBars(n: number, drift = 0.0008): Bar[] {
  const bars: Bar[] = [];
  let c = 100;
  const t0 = 1_600_000_000;
  for (let i = 0; i < n; i++) {
    const shock = (Math.sin(i / 7) + Math.cos(i / 13)) * 0.002;
    c *= 1 + drift + shock;
    bars.push({ t: t0 + i * 86_400, o: c, h: c * 1.01, l: c * 0.99, c, v: 1e6 });
  }
  return bars;
}

describe("buildIndexSignalBlock", () => {
  it("returns walk-forward validation with lean metrics", () => {
    const bars = syntheticBars(900);
    const block = buildIndexSignalBlock(bars, 1);
    expect(block).not.toBeNull();
    expect(block!.validation.days).toBeGreaterThan(100);
    expect(block!.validation.leanN).toBeGreaterThan(0);
    expect(block!.validation.leanHitRate).toBeGreaterThan(0);
    expect(block!.validation.leanThresholds?.bullish).toBeGreaterThan(0.5);
  });
});
