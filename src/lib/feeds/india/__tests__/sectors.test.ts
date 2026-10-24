import { describe, expect, it } from "vitest";
import { rotationStage } from "@/lib/feeds/india/sectors";

describe("rotationStage", () => {
  it("maps relative strength to quadrants", () => {
    expect(rotationStage(0.05, 0.01)).toBe("Leading");
    expect(rotationStage(0.05, -0.01)).toBe("Weakening");
    expect(rotationStage(-0.05, 0.01)).toBe("Improving");
    expect(rotationStage(-0.05, -0.01)).toBe("Lagging");
    expect(rotationStage(null, 0.01)).toBeNull();
  });
});
