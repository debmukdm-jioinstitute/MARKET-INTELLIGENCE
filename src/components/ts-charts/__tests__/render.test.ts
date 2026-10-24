import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TsIndicator } from "../ts-indicator";
import { TsLine } from "../ts-line";

describe("TsIndicator render tests", () => {
  it("renders band label and inside position text", () => {
    const rows = [
      { date: "2026-10-20", v: 50 },
      { date: "2026-10-21", v: 52 },
      { date: "2026-10-22", v: 51 },
    ];
    const html = renderToStaticMarkup(
      React.createElement(TsIndicator, {
        rows,
        recentFrom: "2026-10-21",
        band: [40, 60],
        fmt: "num",
        digits: 0,
      })
    );
    expect(html).toContain("ts-chart");
    expect(html).toContain("usual range");
    expect(html).toContain("inside its usual range");
  });

  it("renders above and below position text when out of band", () => {
    const aboveHtml = renderToStaticMarkup(
      React.createElement(TsIndicator, {
        rows: [{ date: "2026-10-22", v: 85 }],
        recentFrom: "2026-10-22",
        band: [40, 60],
      })
    );
    expect(aboveHtml).toContain("above its usual range");

    const belowHtml = renderToStaticMarkup(
      React.createElement(TsIndicator, {
        rows: [{ date: "2026-10-22", v: 25 }],
        recentFrom: "2026-10-22",
        band: [40, 60],
      })
    );
    expect(belowHtml).toContain("below its usual range");
  });

  it("handles empty observations gracefully", () => {
    const html = renderToStaticMarkup(
      React.createElement(TsIndicator, {
        rows: [],
        recentFrom: "2026-10-22",
        band: [40, 60],
      })
    );
    expect(html).toContain("Source unavailable");
  });
});

describe("TsLine render tests", () => {
  it("renders ts-chart container and handles narrow mode", () => {
    const rows = [
      { date: "2026-10-20", val: 100 },
      { date: "2026-10-21", val: 105 },
    ];
    const series = [{ col: "val", label: "Nifty 50" }];
    const html = renderToStaticMarkup(
      React.createElement(TsLine, {
        rows,
        series,
        band: [90, 110],
        fmt: "num",
        digits: 0,
        narrow: true,
      })
    );
    expect(html).toContain("ts-chart");
  });
});
