import { describe, expect, it } from "vitest";
import { stripEmDashes } from "@/lib/email-copy";
import { RETARGETING_TEMPLATES } from "@/lib/retargeting/templates";

describe("stripEmDashes", () => {
  it("replaces spaced dashes with a comma", () => {
    expect(stripEmDashes("Hi — there")).toBe("Hi, there");
    expect(stripEmDashes("Hi &mdash; there")).toBe("Hi, there");
  });
  it("drops sign-off and separator dashes", () => {
    expect(stripEmDashes("<p>— Debabrata</p>")).toBe("<p>Debabrata</p>");
    expect(stripEmDashes("—<br/>Debabrata")).toBe("<br/>Debabrata");
    expect(stripEmDashes("a\n— Deb")).toBe("a\nDeb");
  });
  it("leaves no em dash behind", () => {
    expect(stripEmDashes("x—y — z &#8212; w")).not.toMatch(/—|&mdash;|&#8212;/);
  });
  it("retargeting templates contain no em dashes", () => {
    expect(JSON.stringify(RETARGETING_TEMPLATES)).not.toMatch(/—|&mdash;|&#8212;/);
  });
});
