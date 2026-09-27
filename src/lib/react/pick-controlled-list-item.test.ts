import { describe, expect, it } from "vitest";
import { pickControlledString } from "./pick-controlled-list-item";

describe("pickControlledString", () => {
  it("keeps selection when still in list", () => {
    expect(pickControlledString(["Today", "Invest"], "Invest")).toBe("Invest");
  });

  it("falls back to first when selection missing", () => {
    expect(pickControlledString(["Invest", "Trade"], "Today")).toBe("Invest");
  });

  it("returns selected when list empty", () => {
    expect(pickControlledString([], "Today")).toBe("Today");
  });
});
